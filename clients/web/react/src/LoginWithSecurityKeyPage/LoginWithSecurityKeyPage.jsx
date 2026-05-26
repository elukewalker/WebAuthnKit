import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { userActions, credentialActions, alertActions } from '../_actions';
import { ServerVerifiedPin } from '../_components';
import { useNavigate } from 'react-router-dom';

import { get, supported } from '@github/webauthn-json';
import base64url from 'base64url';
import { signIn, confirmSignIn, fetchAuthSession } from 'aws-amplify/auth';
import { Button, Modal } from 'react-bootstrap';


function LoginWithSecurityKeyPage() {
    const username = localStorage.getItem('username');
    const [submitted, setSubmitted] = useState(false);
    const [cognitoUser, setCognitoUser] = useState({});
    const webAuthnStartResponse = useSelector(state => state.authentication.webAuthnStartResponse);
    const defaultInvalidPIN = -1;
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // reset login status
    useEffect(() => { 
        dispatch(userActions.logout()); 
        
        if(username) {
            signInWithUsername();
        } else {
            setSubmitted(true);
            dispatch(userActions.webAuthnStart());
        }
        
    }, []);

    useEffect(() => { 
        if(webAuthnStartResponse) {
            signInWithoutUsername();
        }
    }, [webAuthnStartResponse]);

    function getUV(authenticatorData) {
        let buffer = base64url.toBuffer(authenticatorData);
        
        let flagsBuf = buffer.slice(32, 33);
        let flagsInt      = flagsBuf[0];
        let flags = {
            up: !!(flagsInt & 0x01),
            uv: !!(flagsInt & 0x04),
            at: !!(flagsInt & 0x40),
            ed: !!(flagsInt & 0x80),
            flagsInt
        };
        return flags.uv;
    }

    function handleWebAuthn(e) {
        e.preventDefault();

        if(username) {
            signInWithUsername();
        } else {
            dispatch(userActions.webAuthnStart());
        }
    }

    async function signInWithUsername() {
        setSubmitted(true);

        try {
            let signInResult = await signIn({ username });
            setCognitoUser(signInResult);

            if(signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE' && signInResult.nextStep?.additionalInfo?.type === 'webauthn.create'){
                dispatch(alertActions.error("Please register an account"));
                navigate('/login');
                return;
            } else if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE' && signInResult.nextStep?.additionalInfo?.type === 'webauthn.get') {


                const request = JSON.parse(signInResult.nextStep.additionalInfo.publicKeyCredentialRequestOptions);
                
                const publicKey = {"publicKey": request.publicKeyCredentialRequestOptions};

                let assertionResponse = await get(publicKey);


                let uv = getUV(assertionResponse.response.authenticatorData);

                let challengeResponse = {
                    credential: assertionResponse,
                    requestId: request.requestId,
                    pinCode: defaultInvalidPIN
                };

                if(uv === false) {
                    dispatch(credentialActions.getUV(challengeResponse));
                } else {
                    // to send the answer of the custom challenge
                    confirmSignIn({ challengeResponse: JSON.stringify(challengeResponse) })
                    .then(user => {

                        fetchAuthSession()
                            .then(session => {
                                dispatch(alertActions.success('Authentication successful'));
                                let userData = {
                                    id: 1,
                                    username: user.signInDetails?.loginId || localStorage.getItem('username') || username,
                                    token: session.tokens?.accessToken?.toString()
                                }
                                localStorage.setItem('user', JSON.stringify(userData));
                                navigate('/');
                            })
                            .catch(err => {
                                dispatch(alertActions.error("Something went wrong. ", err.message));
                                setSubmitted(false);
                            });

                    })
                    .catch(err => {
                        dispatch(alertActions.error(err.message));
                    });
                }
            } else {
                setSubmitted(false);
                dispatch(alertActions.error("Invalid server response"));
            }
        } catch (err) {
            setSubmitted(false);
            dispatch(alertActions.error(err.message));
        }
    }

    async function signInWithoutUsername() {
        setSubmitted(true);

        // get usernameless auth request
                
        const publicKey = {"publicKey": webAuthnStartResponse.publicKeyCredentialRequestOptions};

        let assertionResponse = await get(publicKey);

        // get username from assertionResponse
        const username = assertionResponse.response.userHandle;

        let challengeResponse = {
            credential: assertionResponse,
            requestId: webAuthnStartResponse.requestId,
            pinCode: defaultInvalidPIN
        };


        signIn({ username })
        .then(signInResult => {
            if(signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE' && signInResult.nextStep?.additionalInfo?.type === 'webauthn.create'){
                dispatch(alertActions.error("Please register an account"));
                navigate('/login');
                return;
            } else if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE'  && signInResult.nextStep?.additionalInfo?.type === 'webauthn.get') {
                // to send the answer of the custom challenge
                confirmSignIn({ challengeResponse: JSON.stringify(challengeResponse) })
                    .then(user => {

                        fetchAuthSession()
                            .then(session => {
                                dispatch(alertActions.success('Authentication successful'));
                                let userData = {
                                    id: 1,
                                    username: user.signInDetails?.loginId || localStorage.getItem('username') || username,
                                    token: session.tokens?.accessToken?.toString()
                                }
                                localStorage.setItem('user', JSON.stringify(userData));
                                navigate('/');
                            })
                            .catch(err => {
                                dispatch(alertActions.error("Something went wrong. ", err.message));
                                setSubmitted(false);
                            });

                    })
                    .catch(err => {
                        dispatch(alertActions.error(err.message));
                    });
            } else {
                setSubmitted(false);
                dispatch(alertActions.error("Invalid server response"));
            }
        })
        .catch(error => {
            setSubmitted(false);
            dispatch(alertActions.error(error.message));
        });
    }

    function WebAuthn(props) {
        if(!supported()) {
            return(
                <div>This browser is not compatible with WebAuthn</div>
            );
        }

        return(
            <div>
                <form name="form" onSubmit={handleWebAuthn}>
                    <div className="form-group">
                                <button className="btn btn-primary">
                                    {submitted && <span className="spinner-border spinner-border-sm mr-1"></span>}
                                    Login with Security Key
                                </button>
                    </div>
                </form>
            </div>
        );
    }

    function UV(props) {
        const cognitoUser = props.cognitoUser;
        const finishUVRequest = useSelector(state => state.credentials.finishUVRequest);
        const svpinDispatchProps = {type: "dispatch", saveCallback: finishUVResponse, showSelector: finishUVRequest};


        function finishUVResponse(fields) {
            let challengeResponse = finishUVRequest;
            challengeResponse.pinCode = parseInt(fields.pin); 
            
            confirmSignIn({ challengeResponse: JSON.stringify(challengeResponse) })
            .then(user => {

                fetchAuthSession()
                .then(session => {
                    dispatch(alertActions.success('Authentication successful'));
                    let userData = {
                        id: 1,
                        username: user.signInDetails?.loginId || localStorage.getItem('username') || username,
                        token: session.tokens?.accessToken?.toString()
                    }
                    localStorage.setItem('user', JSON.stringify(userData));
                    navigate('/');
                })
                .catch(err => {
                    dispatch(alertActions.error("Something went wrong. ", err.message));
                    setSubmitted(false);
                });

            })
            .catch(err => {
                let message = "Invalid PIN";
                dispatch(alertActions.error(message));
                setSubmitted(false);
            });
            dispatch(credentialActions.completeUV());
        }

        return (
            <>
                <ServerVerifiedPin {...svpinDispatchProps}/>
            </>
        );
    }

    async function handleRecoveryCode(code) {
        setSubmitted(true);
        try {
            let cognitoUser = await signIn({ username });
            setCognitoUser(cognitoUser);

            confirmSignIn({ challengeResponse: JSON.stringify({recoveryCode: code}) })
                .then(user => {

                    fetchAuthSession()
                    .then(session => {
                        dispatch(alertActions.success('Authentication successful'));
                        let userData = {
                            id: 1,
                            username: user.signInDetails?.loginId || localStorage.getItem('username') || username,
                            token: session.tokens?.accessToken?.toString()
                        }
                        localStorage.setItem('user', JSON.stringify(userData));
                        navigate('/');
                    })
                    .catch(err => {
                        dispatch(alertActions.error("Something went wrong. ", err.message));
                        setSubmitted(false);
                    });
                })
                .catch(err => {
                    setSubmitted(false);
                    let msg = "Invalid recovery code";
                    dispatch(alertActions.error(msg));
                });

        } catch (error) {
            setSubmitted(false);
            dispatch(alertActions.error(error.message));
        }
    }

    function RecoveryCodes() {

        const [show, setShow] = useState(false);
        const [code, setCode] = useState(undefined);
        const inputRef = useRef(null);
        
        useEffect(() => {
            if(show) {
                inputRef.current.focus();
            }
        }, [show]);

        const handleClose = () => {
            setShow(false);
            setSubmitted(false);
        }
        const handleCancel = () => {
            setShow(false);
            setSubmitted(false);
        }
        const handleLogin = () => {
            setShow(false);

            handleRecoveryCode(code);
            
            setCode(undefined);
        }
        const handleShow = () => {
            setCode(undefined);
            setShow(true);
        }
        const handleChangeCode = (e) => {
            const { name, value } = e.target;
            setCode(value);
        }

        return (
            <>
                <label onClick={handleShow} className="btn btn-link">Login another way     </label> <label className="btn btn-link"><a href="/login">Cancel</a></label>
                <Modal show={show} onHide={handleClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Enter RecoveryCode</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <label>Recovery Code </label>
                        <input type="password" name="code" autoFocus value={code} onChange={handleChangeCode} ref={inputRef} onKeyPress={(ev) => {
                                if (ev.key === 'Enter') {
                                    handleLogin();
                                    ev.preventDefault();
                                }
                            }}/>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleLogin}>
                            Login
                        </Button>
                    </Modal.Footer>
                </Modal>
            </>
        );
    }

    return (
        <>
            <h2>Login</h2>
            <h2>{username}</h2>
            <WebAuthn />
            <UV cognitoUser={cognitoUser} />
            <RecoveryCodes /> 
        </>
    );
}

export { LoginWithSecurityKeyPage };