const axios = require('axios');

const apiUrl = 'https://29581.humly.cloud/api/v1';

const username = "user@pcs-security.com"
const password = "insert password here"

const requestOptions = {
    headers: {
        "Content-Type": "application/json",
    },
};

return axios.post(
    `${apiUrl}/login`,
    { username, password },
    requestOptions
).then(response => {
    const responseStatus = response.status;
    const responseData = response.data;

    console.log('Response Status:', responseData);

    // continue with booking request
    return { responseStatus, responseData };
}).catch((error) => {
    console.log(error);
});



