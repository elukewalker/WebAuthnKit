import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Row, Col } from 'react-bootstrap';

import { userActions, credentialActions, alertActions } from '../_actions';
import { ServerVerifiedPin } from '../_components';

import { create, supported } from '@github/webauthn-json';
import base64url from 'base64url';
import cbor from 'cbor';
import { signUp, signIn, confirmSignIn, fetchAuthSession } from 'aws-amplify/auth';

function RegisterPage() {

    const username = localStorage.getItem('username');
    const [submitted, setSubmitted] = useState(false);
    const signInResult = useSelector(state => state.authentication.signInResult);
    const navigate = useNavigate();
    const [cognitoUser, setCognitoUser] = useState({});
    const defaultInvalidPIN = -1;
    const dispatch = useDispatch();


    // reset login status
    useEffect(() => {
        dispatch(userActions.logout());

        // Track if navigation is via back button
        let isBackNavigation = false;

        const handlePopState = () => {
            isBackNavigation = true;
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            // Only dispatch completeUV if navigating back
            if (isBackNavigation) {
                dispatch(credentialActions.completeUV());
            }
        };
    }, [dispatch]);

    async function handleWebAuthn(e) {
        if(submitted === true) {
            //do nothing, we are in the middle of the registration ceremony
            return;
        }

        setSubmitted(true);

        e.preventDefault();


        // start Registration
        const randomString = (length) => [...Array(length)].map(() => (Math.floor(Math.random() * 36)).toString(36)).join('');
        const password = randomString(14);
        const usernameLower = username.toLowerCase();
        const attributes =  {"name": usernameLower};

        try {
            const { user } = await signUp({
                username,
                password,
                options: {
                    userAttributes: attributes
                }
            });
        } catch (error) {
            // A user can get here if they come back to register after the initial registration was interrupted
        }

        try {

            let signInResult = await signIn({ username });
            setCognitoUser(signInResult);

            if(signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE' && signInResult.nextStep?.additionalInfo?.type === 'webauthn.get'){
                dispatch(alertActions.error("You have already registered. Please sign in."));
                navigate('/login');
                return;
            }

            if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE' && signInResult.nextStep?.additionalInfo?.type === 'webauthn.create') {


                let request = JSON.parse(signInResult.nextStep.additionalInfo.publicKeyCredentialCreationOptions);

                if ( request.publicKeyCredentialCreationOptions === "error" ) {
                    let error = "Error generating public key creation options";
                    setSubmitted(false);
                    dispatch(alertActions.error(error.toString()));
                    return;
                }

                let publicKey = { "publicKey": request.publicKeyCredentialCreationOptions };

                let credential = await create(publicKey);


                let uv = getUV(credential.response.attestationObject);

                let challengeResponse = {
                    credential: credential,
                    requestId: request.requestId,
                    pinCode: defaultInvalidPIN
                }; 

                if(uv === false) {
                    dispatch(credentialActions.getUV(challengeResponse));
                } else {
                    // to send the answer of the custom challenge
                    try {
                        const user = await confirmSignIn({ challengeResponse: JSON.stringify(challengeResponse) });
                        const session = await fetchAuthSession();
                        dispatch(alertActions.success('Registration successful'));
                        let userData = {
                            "id": 1,
                            "username": user.username || user.signInDetails?.loginId,
                            "token": session.tokens?.accessToken?.toString()
                        }
                        localStorage.setItem('user', JSON.stringify(userData));
                        navigate('/');
                    } catch (err) {
                        dispatch(alertActions.error("Something went wrong. ", err.message));
                        setSubmitted(false);
                    }
                }
            } else {
                let error = "Invalid challengeName and type";
                setSubmitted(false);
                dispatch(alertActions.error(error));
            }
        } catch (error) {
            setSubmitted(false);
            dispatch(alertActions.error(error.toString()));
        }
    }

    function getUV(attestationObject) {
        let attestationBuffer = base64url.toBuffer(attestationObject);
        let attestationStruct = cbor.decodeAllSync(attestationBuffer)[0];
        let buffer = attestationStruct.authData;
        
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

    function WebAuthn() {

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
                                    Register Security Key
                                </button>
                    </div>
                </form>
            </div>
        );
    }

    function UV(props) {
        const cognitoUser = props.cognitoUser;
        const finishUVRequest = useSelector(state => state.credentials.finishUVRequest);
        const svpinCreateProps = {type: "create", saveCallback: finishUVResponse, showSelector: finishUVRequest};
        const registering = useSelector(state => state.registration.registering); 


        function finishUVResponse(fields) {
            if(registering) {
                return;
            }
            
            let challengeResponse = finishUVRequest;
            challengeResponse.pinCode = parseInt(fields.pin); 
            
            confirmSignIn({ challengeResponse: JSON.stringify(challengeResponse) })
            .then(user => {

                fetchAuthSession()
                .then(session => {
                    dispatch(alertActions.success('Registration successful'));
                    let userData = {
                        "id": 1,
                        "username": user.username || user.signInDetails?.loginId,
                        "token": session.tokens?.accessToken?.toString()
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
                <ServerVerifiedPin {...svpinCreateProps}/>
            </>
        );
    }

    return (
        <>
            <h2>Hello {username}</h2>
            <label>Welcome to the WebAuthn Start Kit.</label>
            <WebAuthn />
            <UV cognitoUser={cognitoUser} />
            <label>Please register a security key to finish setting up your account.</label>
            <Row>
                <Col>
                    <Link to="/login" className="btn btn-link">Cancel</Link>
                </Col>
            </Row>
            
        </>
    );
}

export { RegisterPage };