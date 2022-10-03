const express = require('express')
const app = express()
const cors = require("cors");
const http = require("http").Server(app);
const PORT = 4000;

const socketIO = require("socket.io")(http, {
    cors: {
        origin: "http://localhost:3000",
    },
});

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Genereates a random string
const fetchID = () => Math.random().toString(36).substring(2, 10);

// Nested Object
let tasks = {
    pending: {
        title: "pending",
        items: [
            {
                id: fetchID(),
                title: "Send the Figma file to Dima",
                comments: [],
            },
        ],
    },
    ongoing: {
        title: "ongoing",
        items: [
            {
                id: fetchID(),
                title: "Review GitHub issues",
                comments: [
                    {
                        name: "David",
                        text: "Ensure you review before merging",
                        id: fetchID(),
                    },
                ],
            },
        ],
    },
    completed: {
        title: "completed",
        items: [
            {
                id: fetchID(),
                title: "Create technical contents",
                comments: [
                    {
                        name: "Dima",
                        text: "Make sure you check the requirements",
                        id: fetchID(),
                    },
                ],
            },
        ],
    },
};

socketIO.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    socket.on('createTask', (data) => {
        const newTask = {
            id: fetchID(),
            title: data.task,
            comments: []
        }
        tasks['pending'].items.push(newTask);
        socket.emit("tasks", tasks);
    });

    socket.on("fetchComments", (data) => {
        const taskItems = tasks[data.category].items;
        for (let i = 0; i < taskItems.length; i++) {
            if (taskItems[i].id === data.id) {
                socket.emit("comments", taskItems[i].comments);
            }
        }
    })

    socket.on("addComment", (data) => {
        const { category, userId, comment, id } = data;
        const taskItems = tasks[category].items;

        for (let i = 0; i < taskItems.length; i++) {
            if (taskItems[i].id === id) {
                taskItems[i].comments.push({
                    name: userId,
                    text: comment,
                    id: fetchID(),
                });
                socket.emit("comments", taskItems[i].comments);
            }
        }
    })

    socket.on("taskDragged", (data) => {
        const { source, destination } = data;
        const itemMoved = {
            ...tasks[source.droppableId].items[source.index],
        };
        console.log("ItemMoved>>> ", itemMoved);
        tasks[source.droppableId].items.splice(source.index, 1);
        tasks[destination.droppableId].items.splice(
            destination.index,
            0,
            itemMoved
        );
        console.log("Source >>>", tasks[source.droppableId].items);
        console.log("Destination >>>", tasks[destination.droppableId].items);
        socket.emit("tasks", tasks);
    });

    socket.on('disconnect', () => {
        socket.disconnect();
        console.log('🔥: A user disconnected');
    });
})

app.get("/api", (req, res) => {
    res.json(tasks);
});

http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});