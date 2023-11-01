require('dotenv').config();
const fs = require("fs");
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');

const axios = require('axios');
const apiUrl = process.env.API_URL;
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const schedule = require('node-schedule');

// hourly
schedule.scheduleJob('0 */1 * * *', function (fireDate) {
    jsonReader("./seats.json", async (err, seatsfile) => {
        jsonReader("./users.json", async (err, usersfile) => {
            const seatings = seatsfile.seats;
            const users = Object.values(usersfile);
            console.log(`START => ${new Date()}`)
            for (let i = 0; i < seatings.length; i++) {
                // console.log(seatings[i])
                // console.log(users[i%users.length])

                const booking = {
                    "username": users[i % users.length].username,
                    "password": users[i % users.length].password,
                    "desk": seatings[i],
                    "startTime": moment().set('hour', 10).set('minute', 0).format("YYYY-MM-DDTHH:mm:ssZ"),  //fromTime.format("YYYY-MM-DDTHH:mm:ssZ")
                    "endTime": moment().set('hour', 18).set('minute', 0).format("YYYY-MM-DDTHH:mm:ssZ")     //toTime.format("YYYY-MM-DDTHH:mm:ssZ")
                }
                console.log(booking)
                await HumlyBook(booking.username, booking.password, booking.desk, booking.startTime, booking.endTime)
            }
            console.log(`END => ${new Date()}}`)
        })
    })
});

// biweekly
schedule.scheduleJob('0 * 1,15 * *', function () {
    jsonReader("./seats.json", async (err, seatsfile) => {
        jsonReader("./users.json", async (err, usersfile) => {
            const seatings = seatsfile.seats;
            const users = Object.values(usersfile);
            console.log(`START => ${new Date()}`)
            for (let i = 0; i < seatings.length; i++) {
                const currentDateIndex = moment().isoWeekday();
                const exclude = [6, 7, 13, 14]
                for (let index = currentDateIndex; index < 20; index++) {
                    if (!exclude.includes(index)) {
    
                        const booking = {
                            "username": users[i % users.length].username,
                            "password": users[i % users.length].password,
                            "desk": seatings[i],
                            "startTime": moment().isoWeekday(index).set('hour', 10).set('minute', 0).format("YYYY-MM-DDTHH:mm:ssZ"),  //fromTime.format("YYYY-MM-DDTHH:mm:ssZ")
                            "endTime": moment().isoWeekday(index).set('hour', 18).set('minute', 0).format("YYYY-MM-DDTHH:mm:ssZ")     //toTime.format("YYYY-MM-DDTHH:mm:ssZ")
                        }
                        await HumlyBook(booking.username, booking.password, booking.desk, booking.startTime, booking.endTime)
                    }
                }
            }
            console.log(`END => ${new Date()}}`)
        })
    })
});

async function HumlyBook(username, password, desk, startTime, endTime) {
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
        return await createBooking(userId, token, bookingData)
    }).catch((error) => {
        console.log(error);
    });
}

async function HumlyBooking(toMsg, username, password, desk, startTime, endTime) {
    let res = await HumlyBook(username, password, desk, startTime, endTime)
    if (res.status == 'success') {
        return await bot.sendMessage(toMsg.chat.id, `Booking Completed for ${moment(startTime).format("MMM D, ddd h:mm A")} to ${moment(endTime).format("LT")}`)
    } else {
        return await bot.sendMessage(toMsg.chat.id, `Booking Failed for ${moment(startTime).format("MMM D, ddd h:mm A")} to ${moment(endTime).format("LT")}\nPlease try again`)
    }
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

function split(str, index) {
    const result = [str.slice(0, index), str.slice(index)];

    return result;
}
bot.onText(/\/start/, (msg) => {

    bot.sendMessage(msg.chat.id, "Welcome, please /config your credential and then /book your seats");

});

bot.onText(/\/config/, async msg => {
    const userNamePrompt = await bot.sendMessage(msg.chat.id, `Hi @${msg.from.username
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
                users[`${msg.from.id
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
        if (users[`${msg.from.id
            }`]) {
            const booking = {
                "username": users[`${msg.from.id
                    }`].username,
                "password": users[`${msg.from.id
                    }`].password,
                "desk": "",
                "startTime": "",  //fromTime.format("YYYY-MM-DDTHH:mm:ssZ")
                "endTime": ""     //toTime.format("YYYY-MM-DDTHH:mm:ssZ")
            }
            const seatPrompt = await bot.sendMessage(msg.chat.id, `Hi @${msg.from.username
                }, Which seat are you booking?`, {
                reply_markup: {
                    force_reply: true
                }
            });
            bot.onReplyToMessage(msg.chat.id, seatPrompt.message_id, async (seatMsg) => {
                booking.desk = seatMsg.text.toLocaleUpperCase();
                // 2. From what time
                const fromPrompt = await bot.sendMessage(seatMsg.chat.id, "From when?", {
                    reply_markup: {
                        force_reply: true
                    }
                });
                bot.onReplyToMessage(seatMsg.chat.id, fromPrompt.message_id, async (fromMsg) => {
                    let fromText = fromMsg.text;
                    if (!isNaN(Number(fromText))) {
                        let fromTime = moment();
                        let toTime = moment();
                        if (fromText != "now") {
                            if (fromText.includes("all")) {
                                toTime = moment().set('hour', 23).set('minute', 59);
                                booking.startTime = fromTime.format("YYYY-MM-DDTHH:mm:ssZ");
                                booking.endTime = toTime.format("YYYY-MM-DDTHH:mm:ssZ");
                                return await HumlyBooking(fromMsg, booking.username, booking.password, booking.desk, booking.startTime, booking.endTime)
                            } else {
                                if (fromText.length <= 2) {
                                    fromText = fromText + "00"
                                }
                                const [hour, minute] = split(fromText, -2)
                                fromTime = fromTime.set('hour', Number(hour)).set('minute', Number(minute));
                                booking.startTime = fromTime.format("YYYY-MM-DDTHH:mm:ssZ");
                            }
                        }
                        // 3. To what time
                        const toPrompt = await bot.sendMessage(fromMsg.chat.id, "To when?", {
                            reply_markup: {
                                force_reply: true
                            }
                        });
                        bot.onReplyToMessage(fromMsg.chat.id, toPrompt.message_id, async (toMsg) => {
                            let toText = toMsg.text;
                            if (!isNaN(Number(toText))) {
                                if (toText.length <= 2) {
                                    toText = toText + "00"
                                }
                                const [hour, minute] = split(toText, -2)
                                toTime = moment().set('hour', hour).set('minute', minute)
                                booking.endTime = toTime.format("YYYY-MM-DDTHH:mm:ssZ");
                                return await HumlyBooking(toMsg, booking.username, booking.password, booking.desk, booking.startTime, booking.endTime)
                            } else {
                                bot.sendMessage(toMsg.chat.id, "Error: Please provide time in [HH] or [HHmm]")
                            }
                        });
                    } else {
                        bot.sendMessage(fromMsg.chat.id, "Error: Please provide time in [HH] or [HHmm]")
                    }
                });
            });
        } else {
            await bot.sendMessage(msg.chat.id, `Hi @${msg.from.username
                }, Please setup your account using \`/config\``)
        }
    });
});

bot.onText(/\/weekly/, async msg => {
    jsonReader("./users.json", async (err, users) => {
        if (err) {
            console.log("Error reading file:", err);
            return;
        }
        if (users[`${msg.from.id
            }`]) {
            const booking = {
                "username": users[`${msg.from.id
                    }`].username,
                "password": users[`${msg.from.id
                    }`].password,
                "desk": "",
                "startTime": "",  //fromTime.format("YYYY-MM-DDTHH:mm:ssZ")
                "endTime": ""     //toTime.format("YYYY-MM-DDTHH:mm:ssZ")
            }

            const seatPrompt = await bot.sendMessage(msg.chat.id, `Hi @${msg.from.username
                }, Which seat are you booking?`, {
                reply_markup: {
                    force_reply: true
                }
            });
            bot.onReplyToMessage(msg.chat.id, seatPrompt.message_id, async (seatMsg) => {
                booking.desk = seatMsg.text.toLocaleUpperCase();

                try {
                    const currentDateIndex = moment().isoWeekday();
                    if (currentDateIndex > 5) {
                        for (let index = 1; index < 6; index++) {
                            let fromTime = moment().add(1, 'week').isoWeekday(index).set('hour', 10).set('minute', 0);
                            let toTime = moment().add(1, 'week').isoWeekday(index).set('hour', 18).set('minute', 0);
                            booking.startTime = fromTime.format("YYYY-MM-DDTHH:mm:ssZ");
                            booking.endTime = toTime.format("YYYY-MM-DDTHH:mm:ssZ");
                            await HumlyBooking(seatMsg, booking.username, booking.password, booking.desk, booking.startTime, booking.endTime)
                        }
                    } else {
                        for (let index = currentDateIndex; index < 6; index++) {
                            let fromTime = moment().isoWeekday(index).set('hour', 10).set('minute', 0);
                            let toTime = moment().isoWeekday(index).set('hour', 18).set('minute', 0);
                            booking.startTime = fromTime.format("YYYY-MM-DDTHH:mm:ssZ");
                            booking.endTime = toTime.format("YYYY-MM-DDTHH:mm:ssZ");
                            await HumlyBooking(seatMsg, booking.username, booking.password, booking.desk, booking.startTime, booking.endTime)
                        }
                    }
                } catch (error) {
                    console.log(error)
                }
            })
        } else {
            await bot.sendMessage(msg.chat.id, `Hi @${msg.from.username
                }, Please setup your account using \`/config\``)
        }
    })
});

bot.onText(/\/biweekly/, async msg => {
    jsonReader("./users.json", async (err, users) => {
        if (err) {
            console.log("Error reading file:", err);
            return;
        }
        if (users[`${msg.from.id
            }`]) {
            const booking = {
                "username": users[`${msg.from.id
                    }`].username,
                "password": users[`${msg.from.id
                    }`].password,
                "desk": "",
                "startTime": "",  //fromTime.format("YYYY-MM-DDTHH:mm:ssZ")
                "endTime": ""     //toTime.format("YYYY-MM-DDTHH:mm:ssZ")
            }

            const seatPrompt = await bot.sendMessage(msg.chat.id, `Hi @${msg.from.username
                }, Which seat are you booking?`, {
                reply_markup: {
                    force_reply: true
                }
            });
            bot.onReplyToMessage(msg.chat.id, seatPrompt.message_id, async (seatMsg) => {
                booking.desk = seatMsg.text.toLocaleUpperCase();

                try {
                    const currentDateIndex = moment().isoWeekday();
                    const exclude = [6, 7, 13, 14]
                    for (let index = currentDateIndex; index < 20; index++) {
                        if (!exclude.includes(index)) {
                            let fromTime = moment().isoWeekday(index).set('hour', 10).set('minute', 0);
                            let toTime = moment().isoWeekday(index).set('hour', 18).set('minute', 0);
                            booking.startTime = fromTime.format("YYYY-MM-DDTHH:mm:ssZ");
                            booking.endTime = toTime.format("YYYY-MM-DDTHH:mm:ssZ");
                            await HumlyBooking(seatMsg, booking.username, booking.password, booking.desk, booking.startTime, booking.endTime)
                        }
                    }
                } catch (error) {
                    console.log(error)
                }
            })
        } else {
            await bot.sendMessage(msg.chat.id, `Hi @${msg.from.username
                }, Please setup your account using \`/config\``)
        }
    })
});