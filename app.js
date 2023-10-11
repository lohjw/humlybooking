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
    const userId = responseData.data.userId;
    const token = responseData.data.authToken;

    console.log('Response Status:', responseData);

    const bookingData = {
        "roomId": "1b525adc73523", // for SP-C30
        "startDate": "2023-10-14T14:00:00+08:00",
        "endDate": "2023-10-14T18:00:00+08:00",
        "organizer": userId,
        "subject": "Booked"
    }

    createBooking(userId, token, bookingData)

    // const queryParams = {}
    // getAllDesks(userId, token, queryParams)

    // continue with booking request
    // return { responseStatus, responseData };
}).catch((error) => {
    console.log(error);
});


function createBooking(userId, authToken, bookingData) {
    const requestOptions = {
        headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId,
            "X-Auth-Token": authToken,
        },
    };

    return axios.post(
        `${apiUrl}/bookings`,
        bookingData,
        requestOptions
    ).then(response => {
        const responseData = response.data;
    
        console.log('Response Status:', responseData);
    
        // continue with booking request
        // return { responseStatus, responseData };
    }).catch((error) => {
        // throw new RequestError(
        //     error.response.data.message,
        //     error.response.status,
        //     error.response.data
        // );
        console.log(error)
    });
}


// test get all desks
function getAllDesks(userId, authToken, queryParams) {
    const requestOptions = {
        headers: {
            "X-User-Id": userId,
            "X-Auth-Token": authToken,
        },
        params: {
            country: queryParams.country,
            city: queryParams.city,
            building: queryParams.building,
            floor: queryParams.floor,
            date: queryParams.date,
            status: queryParams.status,
            pageNumber: queryParams.pageNumber,
            pageSize: queryParams.pageSize,
            sort: queryParams.sort,
        },
    };

    return axios.get(
        `${apiUrl}/desks`,
        requestOptions
    ).then(response => {
        const responseData = response.data;
    
        console.log('Response Status:', responseData);
    
        // continue with booking request
        // return { responseStatus, responseData };
    }).catch((error) => {
        console.log(error);
    });
}