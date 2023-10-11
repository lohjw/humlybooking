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
).then(async response => {
    const responseData = response.data;
    const userId = responseData.data.userId;
    const token = responseData.data.authToken;

    console.log('Response Status:', responseData);

    // search for desk id
    const queryParams = {
        deskIdentifier 	: process.env.BOOK_DESK_NAME
    }
    let deskId = await getAllDesks(userId, token, queryParams)
    
    // WIP: construct booking data
    const bookingData = {
        "roomId": deskId,
        "startDate": process.env.START_BOOK_DATE, // update this
        "endDate": process.env.END_BOOK_DATE, // update this
        "organizer": userId,
        "subject": "Booked"
    }

    // book desk
    createBooking(userId, token, bookingData)

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
    }).catch((error) => {
        console.log(error)
    });
}


// get desk id from desk name
function getAllDesks(userId, authToken, queryParams) {
    const requestOptions = {
        headers: {
            "X-User-Id": userId,
            "X-Auth-Token": authToken,
        },
        params: {
            deskIdentifier: queryParams.deskIdentifier
        },
    };

    return axios.get(
        `${apiUrl}/desks`,
        requestOptions
    ).then(response => {
        const responseData = response.data;
        return responseData.data[0].id
    }).catch((error) => {
        console.log(error);
    });
}