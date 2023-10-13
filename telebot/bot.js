require('dotenv').config();
const fs = require("fs");
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');

const axios = require('axios');
const apiUrl = process.env.API_URL;

function HumlyBooking(username, password, desk, startTime, endTime) {
    return axios.post(`${apiUrl}/login`, {
        username,
        password
    }, {
        headers: {
            "Content-Type": "application/json"
        }
    }).then(async response => {
        const responseData = response.data;
        const userId = responseData.data.userId;
        const token = responseData.data.authToken;

        console.log('Response Status:', responseData);

        // search for desk id
        const queryParams = {
            deskIdentifier: desk
        }
        let deskId = await getAllDesks(userId, token, queryParams)

        // WIP: construct booking data
        const bookingData = {
            "roomId": deskId,
            "startDate": startTime, // update this
            "endDate": endTime, // update this
            "organizer": userId,
            "subject": "Booked"
        }

        // book desk
        let res = await createBooking(userId, token, bookingData)
        return res
    }).catch((error) => {
        console.log(error);
    });
}

// create booking
function createBooking(userId, authToken, bookingData) {
    const requestOptions = {
        headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId,
            "X-Auth-Token": authToken
        }
    };

    return axios.post(`${apiUrl}/bookings`, bookingData, requestOptions).then(response => {
        const responseData = response.data;
        console.log('Response Status:', responseData);
        return responseData;
    }).catch((error) => {
        console.log(error)
        return error
    });
}


// get desk id from desk name
function getAllDesks(userId, authToken, queryParams) {
    const requestOptions = {
        headers: {
            "X-User-Id": userId,
            "X-Auth-Token": authToken
        },
        params: {
            deskIdentifier: queryParams.deskIdentifier
        }
    };

    return axios.get(`${apiUrl}/desks`, requestOptions).then(response => {
        const responseData = response.data;
        return responseData.data[0].id
    }).catch((error) => {
        console.log(error);
    });
}


const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});

function jsonReader(filePath, cb) {
    fs.readFile(filePath, (err, fileData) => {
        if (err) {
            return cb && cb(err);
        }
        try {
            const object = JSON.parse(fileData);
            return cb && cb(null, object);
        } catch (err) {
            return cb && cb(err);
        }
    });
}

bot.onText(/\/config/, async msg => {
    const userNamePrompt = await bot.sendMessage(msg.chat.id, `Hi @${
        msg.from.username
    }, what's your username?`, {
        reply_markup: {
            force_reply: true
        }
    });
    bot.onReplyToMessage(msg.chat.id, userNamePrompt.message_id, async (userNameMsg) => {
        const name = userNameMsg.text;
        // save name in DB if you want to ...
        const passwordPrompt = await bot.sendMessage(userNameMsg.chat.id, `What's your password?`, {
            reply_markup: {
                force_reply: true
            }
        });
        bot.onReplyToMessage(userNameMsg.chat.id, passwordPrompt.message_id, async (passwordMsg) => {
            const password = passwordMsg.text;
            const userConfig = {
                "username": name,
                "password": password
            }
            console.log(JSON.stringify(userConfig))
            jsonReader("./users.json", (err, users) => {
                if (err) {
                    console.log("Error reading file:", err);
                    return;
                }
                users[`${
                        msg.from.username
                    }`] = userConfig

                fs.writeFile("./users.json", JSON.stringify(users, null, 4), err => {
                    if (err) 
                        console.log("Error writing file:", err);
                });
            });
            await bot.sendMessage(userNameMsg.chat.id, `Config updated`)
        })
    });
});


bot.onText(/\/book/, async msg => { // 1. Get seat number
    jsonReader("./users.json", async (err, users) => {
        if (err) {
            console.log("Error reading file:", err);
            return;
        }
        if (users[`${
                msg.from.username
            }`]) {
            const seatPrompt = await bot.sendMessage(msg.chat.id, `Hi @${
                msg.from.username
            }, Which seat are you booking?`, {
                reply_markup: {
                    force_reply: true
                }
            });
            bot.onReplyToMessage(msg.chat.id, seatPrompt.message_id, async (seatMsg) => {
                const seat = seatMsg.text;
                // 2. From what time
                const fromPrompt = await bot.sendMessage(seatMsg.chat.id, "From what time?", {
                    reply_markup: {
                        force_reply: true
                    }
                });
                bot.onReplyToMessage(seatMsg.chat.id, fromPrompt.message_id, async (fromMsg) => {
                    const fromText = fromMsg.text;
                    // 3. To what time
                    const toPrompt = await bot.sendMessage(fromMsg.chat.id, "To what time?", {
                        reply_markup: {
                            force_reply: true
                        }
                    });
                    bot.onReplyToMessage(fromMsg.chat.id, toPrompt.message_id, async (toMsg) => {
                        const toText = toMsg.text;
                        let fromTime = moment();
                        let toTime = moment();
                        if (fromText != "now") {
                            fromTime = moment().set('hour', fromText);
                        }
                        toTime = moment().set('hour', toText)
                        const booking = {
                            "username": users[`${
                                msg.from.username
                            }`].username,
                            "password": users[`${
                                msg.from.username
                            }`].password,
                            "desk": seat,
                            "startTime": fromTime.add(1, 'day').format("YYYY-MM-DDTHH:mm:ssZ"),
                            "endTime": toTime.add(1, 'day').format("YYYY-MM-DDTHH:mm:ssZ")
                        }
                        const response = await HumlyBooking(booking.username,booking.password,booking.desk,booking.startTime,booking.endTime)
                        // await bot.sendMessage(toMsg.chat.id, JSON.stringify(response))
                        if (response.status == 'success') {
                            await bot.sendMessage(toMsg.chat.id, "Booking Completed")
                        } else {
                            await bot.sendMessage(toMsg.chat.id, "Booking Failed. Please try again")
                        }
                    });
                });
            });
        } else {
            await bot.sendMessage(msg.chat.id, `Hi @${
                msg.from.username
            }, Please setup your account using \`/config\``)
        }
    });
});
