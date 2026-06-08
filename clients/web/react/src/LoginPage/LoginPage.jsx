import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button, Row, Col } from 'react-bootstrap';

import { userActions, alertActions } from '../_actions';
import { get } from '@github/webauthn-json';
import { signIn, confirmSignIn, fetchAuthSession } from 'aws-amplify/auth';
import axios from 'axios';
import aws_exports from '../aws-exports';
import validate from 'validate.js';

axios.defaults.baseURL = aws_exports.apiEndpoint;

function LoginPage() {
    const [inputs, setInputs] = useState({
        username: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [invalidUsername, setInvalidUsername] = useState(undefined);
    const { username } = inputs;
    const loggingIn = useSelector(state => state.authentication.loggingIn);
    const authUser = useSelector(state => state.authentication.user);
    const authError = useSelector(state => state.authentication.error);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const abortControllerRef = useRef(new AbortController());
    const defaultInvalidPIN = -1;
    var constraints = {
        username: {
            presence: true,
            format: {
                pattern: "[a-z0-9_\-]+",
                flags: "i",
                message: "can only contain a-z, 0-9, or _-"
            },
            length: {
                minimum: 3,
                maximum: 20
            }
        }
    };

    function isMediationAvailable() {
        const pubKeyCred = window.PublicKeyCredential;
        if (pubKeyCred &&
            typeof pubKeyCred.isConditionalMediationAvailable === 'function' &&
            pubKeyCred.isConditionalMediationAvailable()) {
            return true;
        }
        return false;
    }

    const passkeyAutofill = useCallback(async (signal) => {
        try {
            const response = await axios.get('/users/credentials/fido2/authenticate');
            const requestOptions = response.data;

            const assertionResponse = await get({
                publicKey: requestOptions.publicKeyCredentialRequestOptions,
                mediation: 'conditional',
                signal: signal,
            });

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
                navigate('/');
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Passkey autofill error:', err);
        }
    }, [dispatch, navigate]);

    // reset login status
    useEffect(() => {
        dispatch(userActions.logout());

        if (isMediationAvailable()) {
            passkeyAutofill(abortControllerRef.current.signal);
        }

        return () => {
            abortControllerRef.current.abort();
        };
    }, []);

    // Handle navigation after exists() action completes
    useEffect(() => {
        if (authUser) {
            // User exists in Cognito - navigate to security key login
            navigate('/loginWithSecurityKey');
        } else if (authError) {
            // User doesn't exist - navigate to register
            navigate('/register');
        }
    }, [authUser, authError, navigate]);

    function handleChange(e) {
        const { name, value } = e.target;
        setInputs(inputs => ({ ...inputs, [name]: value }));
    }

    function handleSubmit(e) {
        e.preventDefault();

        // Abort any in-progress conditional mediation before starting modal auth
        abortControllerRef.current.abort();

        setSubmitted(true);

        const result = validate({username: username}, constraints)
        if(result){
            setInvalidUsername(result.username.join(". "));
            return;
        } else {
            setInvalidUsername(undefined);
        }

        dispatch(userActions.exists(username.toLocaleLowerCase()));

    }

    function handleLoginWithoutUsername() {
        abortControllerRef.current.abort();
        localStorage.removeItem('username');
        navigate('/loginWithSecurityKey');
    }

    return (
        <>
            <h2>WebAuthn Starter Kit</h2>
            <label><em>Enter a username to create an account or sign in.</em></label>
            <form name="form" onSubmit={handleSubmit}>
                <div className="form-group">
                            <label>Username</label>
                            <input type="text" name="username" autoFocus value={username} onChange={handleChange} autoComplete="username webauthn" className={'form-control' + (submitted && invalidUsername ? ' is-invalid' : '')} />
                            {submitted && invalidUsername &&
                                <div className="invalid-feedback">{invalidUsername}</div>
                            }
                </div>
                <div className="form-group">
                            <button className="btn btn-primary">
                                {loggingIn && <span className="spinner-border spinner-border-sm mr-1"></span>}
                                Next
                            </button>
                </div>
            </form>
            <label onClick={handleLoginWithoutUsername} className="btn btn-link">Usernameless Sign In</label>
        </>
    );
}

export { LoginPage };