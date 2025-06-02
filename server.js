const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require("method-override");
const session = require("express-session");
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const http = require("http");
const socketIo = require("socket.io");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
// const twilio = require("twilio");
require("dotenv").config();
const User = require("./models/user.js");
const Skill = require("./models/skill.js");
const Notification = require("./models/Notification");


app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.static(path.join(__dirname, "public")))
app.use(methodOverride("_method"))
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));
// const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Create HTTP server
// const server = http.createServer(app);
// const io = socketIo(server);
// io.on("connection", (socket) => {
//     console.log("A user connected");

//     socket.on("disconnect", () => {
//         console.log("A user disconnected");
//     });
// });

// main().then(() => {
//     console.log("Connection successful");
// }).catch((err) => {
//     console.log(err);
// })
// async function main() {
//     await mongoose.connect(process.env.db_string);
//     // await mongoose.connect("mongodb://localhost:27017/skillswap");
// }

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));



// app.get("/home", async (req, res)=>{
//     const skills = await Skill.find();
//     res.render("home.ejs", {skills});
// })
app.get("/home", async (req, res) => {
    // const skills = await Skill.find();
    // if (!req.session.user) return res.redirect("/user");

    const skills = await Skill.find().populate("user");
    res.render("home.ejs", { user: req.session.user, skills });
});

app.get("/user", (req, res) => {
    res.render("login.ejs");
})

const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;


// user registration


app.post("/user/register", async (req, res) => {
    try {
        let { name, username, email, mobile, password } = req.body;


        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).send('Invalid email address.');
        }

        // Check if username, email, or mobile number is already registered
        const existingUser = await User.findOne({ $or: [{ username }, { email }, { mobile }] });
        if (existingUser) {
            return res.send("Username, Email, or Mobile Number is already in use.");
        }

        // Enforce strong password
        if (!strongPasswordRegex.test(password)) {
            return res.send("Password must be at least 8 characters long, with 1 uppercase letter, 1 number, and 1 special character.");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        let newUser = new User({ name, username, email, mobile, password: hashedPassword });
        await newUser.save();

        res.redirect("/user");
    } catch (err) {
        if (err.code === 11000) {
            return res.send("This email or username is already registered. Please use a different one.");
        }
        console.log(err);
        res.send("Error registering user.");
    }
});


// Login User

app.post("/user/login", async (req, res) => {
    let { email, password } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
        return res.send("Invalid email or password.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.send("Invalid email or password.");
    }

    // Fetch user swap requests and save in session
    const receivedRequests = await SwapRequest.find({ receiver: user._id, status: "pending" })
        .populate("requester requestedSkill");

    req.session.user = user;
    // req.session.receivedRequests = receivedRequests; // Store in session

    res.redirect("/home");
});


// profile

// app.get("/profile", async (req, res) => {
//     if (!req.session.user) return res.redirect("/user");

//     const userSkills = await Skill.find({ user: req.session.user._id });
//     const userId = req.session.user._id;

//         // Fetch requests where the user is the requester (sent requests)
//         const sentRequests = await SwapRequest.find({ requester: userId, status: "pending" })
//         .populate("requestedSkill receiver");

//     // Fetch requests where the user is the receiver (received requests)
//     const receivedRequests = await SwapRequest.find({ receiver: userId, status: "pending" })
//         .populate("requester requestedSkill");


//     res.render("profile.ejs", { user: req.session.user, userSkills, sentRequests, 
//         receivedRequests  });
// });


app.get("/profile", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    try {
        const userSkills = await Skill.find({ user: req.session.user._id });

        const swaps = await SwapRequest.find({
            $or: [
                { requester: req.session.user._id },
                { receiver: req.session.user._id }
            ],
            status: "swapped"
        })
            .populate("requester", "username")
            .populate("receiver", "username")
            .populate("requestedSkill", "name")
            .populate("offeredSkill", "name");

        // Fetch sent requests (pending)
        const sentRequests = await SwapRequest.find({
            requester: req.session.user._id,
            status: "pending"
        }).populate("requestedSkill receiver");

        // Fetch received requests (pending)
        const receivedRequests = await SwapRequest.find({
            receiver: req.session.user._id,
            status: "pending"
        }).populate("requester requestedSkill");


        res.render("profile", {
            user: req.session.user,
            userSkills,
            swaps,
            sentRequests,
            receivedRequests
        });
        // res.render("profile", { user: req.session.user, userSkills, swaps });
    } catch (err) {
        console.error("Error fetching swaps:", err);
        res.redirect("/");
    }
});

// Handle adding a new skill

app.get("/profile/add-skill", async (req, res) => {
    res.render("add-skill.ejs", { user: req.session.user });
})

app.post("/profile/add-skill", async (req, res) => {
    if (!req.session.user) return res.redirect("/user");

    const { title, desc } = req.body;
    const newSkill = new Skill({
        title,
        desc,
        user: req.session.user._id
    });

    await newSkill.save();

    // Add the skill to the user's skills array
    await User.findByIdAndUpdate(req.session.user._id, {
        $push: { skills: newSkill._id }
    });

    res.redirect("/profile");
});


// Handle skill deletion
app.post("/profile/delete-skill", async (req, res) => {
    if (!req.session.user) return res.redirect("/user");

    await Skill.findOneAndDelete({ _id: req.body.skillId, user: req.session.user._id });

    // Remove skill from user's skill list
    await User.findByIdAndUpdate(req.session.user._id, {
        $pull: { skills: req.body.skillId }
    });

    res.redirect("/profile");
});


app.get("/profile/edit", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/user");
    }
    res.render("edit-profile.ejs", { user: req.session.user });
});

app.post("/profile/edit", async (req, res) => {
    let { name, bio, skills } = req.body;
    let user = await User.findById(req.session.user._id);

    user.name = name;
    user.bio = bio;
    // user.skills = skills.split(",").map(s => s.trim());
    await user.save();

    // req.session.user = user; // Update session
    res.redirect("/profile", { user });
});

// change password

app.get("/profile/change-password", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/user");
    }
    res.render("change-password.ejs");
});

app.post("/profile/change-password", async (req, res) => {
    let { oldPassword, newPassword } = req.body;
    let user = await User.findById(req.session.user._id);

    // Validate old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
        return res.send("Old password is incorrect.");
    }

    // Enforce strong password
    if (!strongPasswordRegex.test(password)) {
        return res.send("Password must be at least 8 characters long, with 1 uppercase letter, 1 number, and 1 special character.");
    }

    // Hash and update password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.redirect("/profile");
});

// Forgot password 

// Show forgot password page
app.get("/forgot-password", (req, res) => {
    res.render("forgot-password.ejs");
});

// Handle password reset
app.post("/forgot-password", async (req, res) => {
    const { email, mobile, newPassword } = req.body;

    // Find user by email and mobile number
    const user = await User.findOne({ email, mobile });

    if (!user) {
        return res.send("No user found with this email and mobile number.");
    }

    // Hash new password and update in database
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.send("<script>alert('Password successfully updated!'); window.location='/user';</script>");
});

// Logout

app.post("/user/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/home");
    });
})

// all skils

app.get("/home/skills", async (req, res) => {
    const skills = await Skill.find();
    res.render("skill.ejs", { skills, user: req.session.user })
})

// skill detail
app.get("/skill/:id", async (req, res) => {
    if (!req.session.user) return res.redirect("/user");

    const skill = await Skill.findById(req.params.id).populate("user");

    if (!skill) {
        return res.send("Skill not found");
    }

    if (!skill.user) {
        skill.user = { name: "Unknown" };
    }

    res.render("skill-details.ejs", { skill, user: req.session.user });
});


// swap request
const SwapRequest = require("./models/swapRequest");

app.post("/swap/request", async (req, res) => {
    if (!req.session.user) return res.redirect("/user");

    const { skillId, swapSkill } = req.body;
    const skill = await Skill.findById(skillId);

    const request = new SwapRequest({
        requester: req.session.user._id,
        receiver: skill.user,
        requestedSkill: skill._id,
        offeredSkill: swapSkill,
        status: "pending"
    });

    await request.save();
    res.redirect("/home");
});

// Handle Accept/Reject
// app.post("/swap/respond", async (req, res) => {
//     const { requestId, action } = req.body;
//     const request = await SwapRequest.findById(requestId).populate("requester");

//     if (!request) {
//         return res.send("Swap request not found.");
//     }

//     if (action === "accept") {
//         request.status = "accepted";
//         io.emit(`swap-accepted-${request.requester._id}`, { message: "Your swap request was accepted!" });
//     } else {
//         request.status = "rejected";
//         io.emit(`swap-rejected-${request.requester._id}`, { message: "Your swap request was rejected." });
//     }

//     await request.save();
//     res.redirect("/requests");
// });


app.post("/swap/respond", async (req, res) => {
    const { requestId, action } = req.body;

    try {
        const request = await SwapRequest.findById(requestId);

        if (!request) {
            return res.send("Swap request not found.");
        }

        // if(action != "accept"){
        //     app.post("/reject-request/:requestId", async (req, res) => {
        //         try {
        //             const requestId = req.params.requestId;
        //             const swapRequest = await SwapRequest.findById(requestId);

        //             if (!swapRequest) {
        //                 return res.status(404).send("Request not found");
        //             }

        //             swapRequest.status = "rejected";
        //             await swapRequest.save();

        //             // Save notification for the requester
        //             const notification = new Notification({
        //                 user: swapRequest.requester, // The user who sent the swap request
        //                 message: "Your swap request was rejected.",
        //                 status: "unread",
        //             });

        //             await notification.save();

        //             res.redirect("/swap-requests"); // Redirect back to requests page
        //         } catch (error) {
        //             console.error("Error rejecting swap request:", error);
        //             res.status(500).send("Server Error");
        //         }
        //     });
        // }
        request.status = action === "accept" ? "accepted" : "rejected";
        await request.save();

        res.redirect("/requests");
    } catch (err) {
        console.error("Error updating swap request:", err);
        res.redirect("/requests");
    }
});

// delete the request when it reject
app.delete("/delete-request/:id", async (req, res) => {
    try {
        await SwapRequest.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting request:", error);
        res.status(500).json({ success: false });
    }
});

app.get("/dashboard", async (req, res) => {
    try {
        const userId = req.session.user._id;

        // Fetch unread notifications
        const notifications = await Notification.find({ user: userId, status: "unread" });

        res.render("dashboard", { notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).send("Server Error");
    }
});

// response req



app.get("/requests", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user._id;



        const allRequests = await SwapRequest.find();
        // console.log("All Swap Requests in DB:", allRequests);

        const requests = await SwapRequest.find({ receiver: userId })
            .populate("requester", "username email mobile")
            .populate("receiver", "username email");

        // console.log(requests.requester.phoneNumber);

        res.render("requests", { user: req.session.user, requests });
    } catch (err) {
        console.error("Error fetching swap requests:", err);
        // res.redirect("/dashboard");
        res.status(500).send("Server Error");
    }
});

app.get("/swap/pending", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user._id;


        // Check all swap requests first
        const allRequests = await SwapRequest.find();
        // console.log("All Swap Requests in DB:", allRequests);

        const requests = await SwapRequest.find({ receiver: userId })
            .populate("requester", "username email mobile")
            .populate("receiver", "username email");

        // console.log(requests.requester.phoneNumber);

        res.render("requests", { user: req.session.user, requests });
    } catch (err) {
        console.error("Error fetching swap requests:", err);
        // res.redirect("/dashboard");
        res.status(500).send("Server Error");
    }
})

// router.post("/send-whatsapp", async (req, res) => {
//     try {
//         const { requestId } = req.body;

//         // Find the swap request
//         const swapRequest = await SwapRequest.findById(requestId).populate("requester");

//         if (!swapRequest) {
//             return res.status(404).json({ error: "Swap request not found" });
//         }

//         const requester = swapRequest.requester;
//         const whatsappNumber = requester.whatsappNumber; // Ensure this is stored in DB

//         if (!whatsappNumber) {
//             return res.status(400).json({ error: "Requester has no WhatsApp number linked" });
//         }

//         // Send WhatsApp Message
//         const message = await client.messages.create({
//             from: "whatsapp:" + process.env.TWILIO_WHATSAPP_NUMBER,
//             to: "whatsapp:" + whatsappNumber,
//             body: `Hey ${requester.username}, your swap request has been accepted! 🎉`
//         });

//         console.log("WhatsApp Message Sent:", message.sid);
//         res.json({ success: true, message: "WhatsApp message sent!" });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Failed to send WhatsApp message" });
//     }
// });

app.post("/swap/accept/:id", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    try {
        const swapRequest = await SwapRequest.findById(req.params.id);
        if (!swapRequest) return res.redirect("/requests");

        swapRequest.status = "accepted";
        await swapRequest.save();

        res.redirect("/requests");
    } catch (err) {
        console.error("Error accepting request:", err);
        res.redirect("/requests");
    }
});



app.post("/swap/confirm/:id", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    try {
        const swapRequest = await SwapRequest.findById(req.params.id);
        if (!swapRequest) return res.redirect("/requests");


        swapRequest.status = "swapped";
        await swapRequest.save();

        res.redirect("/profile");
    } catch (err) {
        console.error("Error confirming swap:", err);
        res.redirect("/requests");
    }
});

// app.listen(8080, ()=>{
//     console.log("server is running on port 8080");
// }) imp
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// server.listen(8080, () => {
//     console.log("WebSocket server is running on port 8080");
// });
// module.exports = server;

