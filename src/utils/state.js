import { exportKeyToJWK, importKeyFromJWK, hexToBuffer, bufferToHex } from './crypto.js';

const STORAGE_KEY = 'crypto_wizard_state';

const ACTIVE_ID_KEY = 'crypto_wizard_active_id';

export const INITIAL_STATE = {
    recordId: '',
    msg: '',
    step: 0,
    keys: {
        alice: { ecdh: null, ecdsa: null },
        bob: { ecdh: null }
    },
    sharedHex: '',
    aesKeyHex: '',
    hashHex: '',
    signatureHex: '',
    ciphertextHex: '',
    ivHex: '',
    isTamperedData: false,
    isTamperedSig: false,
    verdict: '' // 'SUCCESS' or 'FAILED'
};

export async function saveState(state) {
    // Create a new object for serialization and DEEP COPY the keys structure
    // to avoid mutating the original state object's keys into JWKs.
    const serialized = { 
        ...state,
        keys: {
            alice: { ...state.keys.alice },
            bob: { ...state.keys.bob }
        }
    };
    
    // Export keys to JWK
    if (state.keys.alice.ecdh) {
        serialized.keys.alice.ecdh = {
            publicKey: await exportKeyToJWK(state.keys.alice.ecdh.publicKey),
            privateKey: await exportKeyToJWK(state.keys.alice.ecdh.privateKey)
        };
    }
    if (state.keys.alice.ecdsa) {
        serialized.keys.alice.ecdsa = {
            publicKey: await exportKeyToJWK(state.keys.alice.ecdsa.publicKey),
            privateKey: await exportKeyToJWK(state.keys.alice.ecdsa.privateKey)
        };
    }
    if (state.keys.bob.ecdh) {
        serialized.keys.bob.ecdh = {
            publicKey: await exportKeyToJWK(state.keys.bob.ecdh.publicKey),
            privateKey: await exportKeyToJWK(state.keys.bob.ecdh.privateKey)
        };
    }

    const stateJson = JSON.stringify(serialized);
    
    // Save active pointer
    if (state.recordId) {
        localStorage.setItem(ACTIVE_ID_KEY, state.recordId);
    }

    // 1. Local storage (cache)
    localStorage.setItem(`${STORAGE_KEY}_${state.recordId || 'current'}`, stateJson);

    // 2. Server storage (SQLite)
    try {
        await fetch('/api/state', {
            method: 'POST',
            body: stateJson
        });
    } catch (e) {
        console.warn("Failed to sync with server", e);
    }
}

export async function loadState(id = null) {
    const recordId = id || localStorage.getItem(ACTIVE_ID_KEY) || 'current';
    let stateJson = localStorage.getItem(`${STORAGE_KEY}_${recordId}`);

    // Try server first
    try {
        const response = await fetch(`/api/state?id=${recordId}`);
        if (response.status === 200) {
            const serverData = await response.text();
            if (serverData) {
                stateJson = serverData;
                localStorage.setItem(`${STORAGE_KEY}_${recordId}`, stateJson);
            }
        } else if (response.status === 204) {
            // No record found on server
            if (!id) return { ...INITIAL_STATE }; // Only return initial if loading current
            return null; // Return null if checking specific ID
        }
    } catch (e) {
        console.warn("Failed to load from server", e);
    }

    if (!stateJson) return { ...INITIAL_STATE };

    const state = JSON.parse(stateJson);

    // Safeguard: ensure keys object exists
    if (!state.keys) state.keys = { ...INITIAL_STATE.keys };

    // Import keys back
    if (state.keys.alice?.ecdh) {
        state.keys.alice.ecdh = {
            publicKey: await importKeyFromJWK(state.keys.alice.ecdh.publicKey, { name: "ECDH", namedCurve: "P-256" }, []),
            privateKey: await importKeyFromJWK(state.keys.alice.ecdh.privateKey, { name: "ECDH", namedCurve: "P-256" }, ["deriveKey", "deriveBits"])
        };
    }
    if (state.keys.alice?.ecdsa) {
        state.keys.alice.ecdsa = {
            publicKey: await importKeyFromJWK(state.keys.alice.ecdsa.publicKey, { name: "ECDSA", namedCurve: "P-256" }, ["verify"]),
            privateKey: await importKeyFromJWK(state.keys.alice.ecdsa.privateKey, { name: "ECDSA", namedCurve: "P-256" }, ["sign"])
        };
    }
    if (state.keys.bob?.ecdh) {
        state.keys.bob.ecdh = {
            publicKey: await importKeyFromJWK(state.keys.bob.ecdh.publicKey, { name: "ECDH", namedCurve: "P-256" }, []),
            privateKey: await importKeyFromJWK(state.keys.bob.ecdh.privateKey, { name: "ECDH", namedCurve: "P-256" }, ["deriveKey", "deriveBits"])
        };
    }

    return state;
}

export async function resetState() {
    const recordId = localStorage.getItem(ACTIVE_ID_KEY) || 'current';
    localStorage.removeItem(ACTIVE_ID_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_${recordId}`);
    
    try {
        // Send a complete empty state to the server
        await fetch('/api/state', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...INITIAL_STATE,
                recordId: recordId 
            }) 
        });
    } catch (e) {
        console.error("Failed to reset on server", e);
    }
    return { ...INITIAL_STATE };
}
