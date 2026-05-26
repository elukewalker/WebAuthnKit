import config from 'config';
import { authHeader } from '../_helpers';

import { signIn, signOut } from 'aws-amplify/auth';
import axios from 'axios';
import aws_exports from '../aws-exports';

axios.defaults.baseURL = aws_exports.apiEndpoint;

export const userService = {
    webAuthnStart,
    logout,
    exists,
    delete: _delete
};

async function webAuthnStart() {
    try {
        const response = await axios.get('/users/credentials/fido2/authenticate');
        return response.data;
    } catch (error) {
        return Promise.reject(error);
    }
}

async function logout() {
    // remove user from local storage to log user out
    localStorage.removeItem('user');
    try {
        await signOut();
      } catch (error) {
      }
}

async function exists(username) {
    const _username = username.toLowerCase();
    try {
        let signInResult = await signIn({ username: _username });
        if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE' && signInResult.nextStep?.additionalInfo?.type === 'webauthn.get') {
            return signInResult;
        } else {
            // user exists but no credentials, registration may have been interrupted
            return _error(signInResult);
        }
    } catch (error) {
        return _error(error);
    }
}

// prefixed function name with underscore because delete is a reserved word in javascript
async function _delete(jwt) {

    axios.defaults.headers.common['Authorization'] = jwt;
    try {
        const response = await axios.delete('/users');
        return response.data;
    } catch (error) {
        return Promise.reject(error);
    }
}

function _error(response) {
    return Promise.reject(JSON.stringify(response));
}
