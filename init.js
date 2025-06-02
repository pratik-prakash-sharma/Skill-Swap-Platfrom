const mongoose = require("mongoose")
const Skill = require("./models/skill");

main().then(() => {
    console.log("Connection successful");
}).catch((err)=>{
    console.log(err); 
})
async function main() {
    await mongoose.connect('mongodb://localhost:27017/skillswap');
}

const allSkills = ([
    {
        "title": "Graphic Design",
        "desc": "Create stunning visuals using Photoshop, Illustrator, and Figma."
    },
    {
        "title": "Web Development",
        "desc": "Build responsive and dynamic websites using HTML, CSS, JavaScript, and React."
    },
    {
        "title": "Digital Marketing",
        "desc": "Boost online presence with SEO, social media marketing, and email campaigns."
    },
    {
        "title": "Content Writing",
        "desc": "Craft engaging blog posts, articles, and copywriting materials."
    },
    {
        "title": "Photography",
        "desc": "Capture and edit professional-quality images using DSLR and Lightroom."
    },
    {
        "title": "Video Editing",
        "desc": "Edit and produce high-quality videos using Premiere Pro and After Effects."
    },
    {
        "title": "Mobile App Development",
        "desc": "Develop user-friendly mobile apps using Flutter and React Native."
    },
    {
        "title": "Data Science",
        "desc": "Analyze and visualize data using Python, Pandas, and machine learning techniques."
    },
    {
        "title": "UI/UX Design",
        "desc": "Create user-centered designs with wireframing and prototyping tools like Figma."
    },
    {
        "title": "Cybersecurity",
        "desc": "Protect systems and data by implementing security best practices and ethical hacking techniques."
    }
]);

Skill.insertMany(allSkills);