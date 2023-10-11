require('dotenv').config();
const axios = require('axios');

const apiUrl = process.env.API_URL;

const username = process.env.HUMLY_USERNAME
const password = process.env.HUMLY_PASSWORD

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