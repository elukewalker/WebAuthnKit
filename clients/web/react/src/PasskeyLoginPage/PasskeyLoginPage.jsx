import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';

import { alertActions } from '../_actions';
import { get } from '@github/webauthn-json';
import { signIn, confirmSignIn, fetchAuthSession } from 'aws-amplify/auth';
import axios from 'axios';
import aws_exports from '../aws-exports';

axios.defaults.baseURL = aws_exports.apiEndpoint;

function PasskeyLoginPage() {
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const defaultInvalidPIN = -1;

    function isMediationAvailable() {
        const pubKeyCred = window.PublicKeyCredential;
        if (pubKeyCred &&
            typeof pubKeyCred.isConditionalMediationAvailable === 'function' &&
            pubKeyCred.isConditionalMediationAvailable()) {
            return true;
        }
        return false;
    }

    const passkeySignIn = useCallback(async () => {
        try {
            const response = await axios.get('/users/credentials/fido2/authenticate');
            const requestOptions = response.data;

            const assertionResponse = await get({
                publicKey: requestOptions.publicKeyCredentialRequestOptions,
                mediation: 'conditional',
            });

            setLoading(true);

            const userHandle = assertionResponse.response.userHandle;
            const challengeResponse = {
                credential: assertionResponse,
                requestId: requestOptions.requestId,
                pinCode: defaultInvalidPIN,
            };

            const signInResult = await signIn({ username: userHandle, options: { authFlowType: 'CUSTOM_WITHOUT_SRP' } });

            if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE' && signInResult.nextStep?.additionalInfo?.type === 'webauthn.get') {
                const user = await confirmSignIn({ challengeResponse: JSON.stringify(challengeResponse) });
                const session = await fetchAuthSession();
                dispatch(alertActions.success('Authentication successful'));
                let userData = {
                    id: 1,
                    username: user.signInDetails?.loginId || userHandle,
                    token: session.tokens?.accessToken?.toString()
                };
                localStorage.setItem('user', JSON.stringify(userData));
                setLoading(false);
                navigate('/');
            } else {
                setLoading(false);
                dispatch(alertActions.error('Unexpected server response'));
            }
        } catch (err) {
            setLoading(false);
            console.error('Passkey sign-in error:', err);
            dispatch(alertActions.error(err.message || 'Passkey sign-in failed'));
        }
    }, [dispatch, navigate]);

    useEffect(() => {
        if (!isMediationAvailable()) {
            navigate('/login');
            return;
        }
        passkeySignIn();
    }, [passkeySignIn, navigate]);

    return (
        <>
            <h2>Login with Passkey</h2>
            <form onSubmit={(e) => e.preventDefault()}>
                <input type="text" id="username-field" autoComplete="username webauthn" style={{ width: '100%' }} className="form-control" placeholder="Select a passkey..." />
            </form>
            <br />
            {loading && (
                <div className="text-center">
                    <Spinner animation="border" role="status" variant="primary" />
                    <h4>Authenticating...</h4>
                </div>
            )}
            <div className="text-center">
                <span>Don't see a passkey? </span>
                <label onClick={() => navigate('/login')} className="btn btn-link">Login another way</label>
            </div>
            <div className="text-center">
                <span>Don't have an account? </span>
                <label onClick={() => navigate('/register')} className="btn btn-link">Sign Up</label>
            </div>
        </>
    );
}

export { PasskeyLoginPage };
