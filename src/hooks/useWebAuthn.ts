import { useState, useEffect, useCallback } from 'react';

const WEBAUTHN_CREDENTIAL_KEY = 'webauthn_credential_id';
const WEBAUTHN_STAFF_KEY = 'webauthn_staff_id';

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function useWebAuthn() {
  const [isSupported, setIsSupported] = useState(false);
  const [hasCredential, setHasCredential] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!window.PublicKeyCredential) {
        setIsSupported(false);
        return;
      }
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsSupported(available);
      } catch {
        setIsSupported(false);
      }
    };
    check();

    // Check for stored credential
    const credId = localStorage.getItem(WEBAUTHN_CREDENTIAL_KEY);
    setHasCredential(!!credId);
  }, []);

  const register = useCallback(async (staffId: string, deviceName?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // 1. Get registration options from server
      const optionsRes = await fetch(
        `${SUPABASE_URL}/functions/v1/webauthn-register?staff_id=${staffId}&origin=${encodeURIComponent(window.location.origin)}`,
        {
          headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` },
        }
      );
      if (!optionsRes.ok) throw new Error('Failed to get registration options');
      const options = await optionsRes.json();

      // 2. Create credential via browser API
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: base64urlDecode(options.challenge).buffer as ArrayBuffer,
          rp: options.rp,
          user: {
            id: base64urlDecode(options.user.id).buffer as ArrayBuffer,
            name: options.user.name,
            displayName: options.user.displayName,
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout,
          attestation: options.attestation,
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error('Credential creation cancelled');

      const response = credential.response as AuthenticatorAttestationResponse;

      // Extract public key (raw format for EC keys)
      const publicKeyBytes = response.getPublicKey?.();
      let publicKeyB64: string;
      if (publicKeyBytes) {
        publicKeyB64 = base64urlEncode(publicKeyBytes);
      } else {
        // Fallback: encode the full attestation object
        publicKeyB64 = base64urlEncode(response.attestationObject);
      }

      // 3. Send to server
      const registerRes = await fetch(
        `${SUPABASE_URL}/functions/v1/webauthn-register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            staff_id: staffId,
            credential_id: base64urlEncode(credential.rawId),
            public_key: publicKeyB64,
            attestation_object: base64urlEncode(response.attestationObject),
            client_data_json: base64urlEncode(response.clientDataJSON),
            device_name: deviceName,
          }),
        }
      );

      if (!registerRes.ok) {
        const err = await registerRes.json();
        throw new Error(err.error || 'Registration failed');
      }

      // Store credential ID locally for quick login
      localStorage.setItem(WEBAUTHN_CREDENTIAL_KEY, base64urlEncode(credential.rawId));
      localStorage.setItem(WEBAUTHN_STAFF_KEY, staffId);
      setHasCredential(true);
      return true;
    } catch (e) {
      console.error('WebAuthn registration failed:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const authenticate = useCallback(async (): Promise<{
    success: boolean;
    user?: { id: string; name: string; role: string };
    permission_level?: string;
  }> => {
    setIsLoading(true);
    try {
      const storedCredentialId = localStorage.getItem(WEBAUTHN_CREDENTIAL_KEY);

      // 1. Get challenge from server
      const params = new URLSearchParams();
      if (storedCredentialId) params.set('credential_id', storedCredentialId);
      params.set('origin', window.location.origin);
      const challengeRes = await fetch(
        `${SUPABASE_URL}/functions/v1/webauthn-authenticate?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` },
        }
      );
      if (!challengeRes.ok) throw new Error('Failed to get challenge');
      const options = await challengeRes.json();

      // 2. Get assertion via browser API
      const assertionOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64urlDecode(options.challenge).buffer as ArrayBuffer,
        rpId: options.rpId,
        userVerification: options.userVerification,
        timeout: options.timeout,
      };

      if (options.allowCredentials) {
        assertionOptions.allowCredentials = options.allowCredentials.map(
          (c: { id: string; type: string; transports?: string[] }) => ({
            id: base64urlDecode(c.id).buffer as ArrayBuffer,
            type: c.type,
            transports: c.transports,
          })
        );
      }

      const assertion = await navigator.credentials.get({
        publicKey: assertionOptions,
      }) as PublicKeyCredential | null;

      if (!assertion) throw new Error('Authentication cancelled');

      const response = assertion.response as AuthenticatorAssertionResponse;

      // 3. Verify with server
      const verifyRes = await fetch(
        `${SUPABASE_URL}/functions/v1/webauthn-authenticate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            credential_id: base64urlEncode(assertion.rawId),
            authenticator_data: base64urlEncode(response.authenticatorData),
            client_data_json: base64urlEncode(response.clientDataJSON),
            signature: base64urlEncode(response.signature),
          }),
        }
      );

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || 'Authentication failed');
      }

      const result = await verifyRes.json();

      // Update stored credential ID (in case a different one was used)
      localStorage.setItem(WEBAUTHN_CREDENTIAL_KEY, base64urlEncode(assertion.rawId));

      return result;
    } catch (e) {
      console.error('WebAuthn authentication failed:', e);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeCredential = useCallback(() => {
    localStorage.removeItem(WEBAUTHN_CREDENTIAL_KEY);
    localStorage.removeItem(WEBAUTHN_STAFF_KEY);
    setHasCredential(false);
  }, []);

  const getStoredStaffId = useCallback((): string | null => {
    return localStorage.getItem(WEBAUTHN_STAFF_KEY);
  }, []);

  return {
    isSupported,
    hasCredential,
    isLoading,
    register,
    authenticate,
    removeCredential,
    getStoredStaffId,
  };
}
