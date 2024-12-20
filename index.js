require("./utils");
require("dotenv").config();

const express = require("express");

// Session management
const session = require("express-session");
const MongoStore = require("connect-mongo");

// Multer for file uploads
// const fs = require("fs");
// const uploadDir = path.join(__dirname, "/public/profile");

// Hash passwords using BCrypt
const bcrypt = require("bcrypt");
const saltRounds = 12;

// shorten url
const shortid = require("shortid");

//db connection
const database = include("databaseConnection");
const db_utils = include("database/db_utils");
const create_tables = include("database/create_tables");
const db_users = include("database/db_users");
const db_threads = include("database/db_threads");
const db_comments = include("database/db_comments");
const db_likes = include("database/db_likes");
const success = db_utils.printMySQLVersion();

//reference of the express module
const app = express();

const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)

/* secret information section */
const mongodb_url = process.env.MONGODB_URL;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;

const crypto = require("crypto");
const { v4: uuid } = require("uuid");
// const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const Joi = require("joi");
const cloudinary = require("cloudinary");
// const e = require("express");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});

// Multer setting
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// let mongoStore = MongoStore.create({
//   mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@cluster0.ttibm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`,
//   crypto: {
//     secret: mongodb_session_secret,
//   },
// });

let mongoStore = MongoStore.create({
  // mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@db-mongodb-nyc3-58279-8a0af033.mongo.ondigitalocean.com/admin?authSource=admin`,
  mongoUrl: `${mongodb_url}`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
    cookie: {
      secure: false, // Set to true if using HTTPS
      maxAge: 3600000, // 1 hour in milliseconds
    },
    autoRemove: "interval",
    autoRemoveInterval: 60, // Sessions older than 1 hour will be removed every minute
    encrypt: true, // Enable encryption for session data (this is usually the default)
  })
);

// Using middleware to pass session data to views
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.authenticated = req.session.authenticated || false;
  next();
});

function isValidSession(req) {
  if (req.session.authenticated) {
    return true;
  }
  return false;
}

function sessionValidation(req, res, next) {
  if (!isValidSession(req)) {
    req.session.destroy();
    res.redirect("/login");
    return;
  } else {
    next();
  }
}

// Home
app.get("/", async (req, res) => {
  const isAuthenticated = req.session.authenticated || false;
  const user_id = req.session.user_id;
  const username = req.session.username;
  const email = req.session.email;
  const profile_img = req.session.profile_img;

  const threads = await db_threads.getAllActiveThreads();

  //when user is not logged in
  if (!isAuthenticated) {
    res.render("index", { authenticated: false, user: null, threads });
  } else {
    const threadIds = threads.map((thread) => thread.thread_id);

    const postData = {
      threadIds: threadIds,
      user_id: user_id,
    };

    const likeCounts = await db_likes.getLikesForThreads(postData);
    const userLikes = await db_likes.getUserLikesForThreads(postData);
    const userComments = await db_comments.getCommentsForThreads(postData);

    // Combine likes, user likes, and comments with threads
    const threadsWithDetails = threads.map((thread) => {
      const likeCountData = likeCounts.find(
        (like) => like.thread_id === thread.thread_id
      ) || { like_count: 0 };
      const userLikeData = userLikes.find(
        (like) => like.thread_id === thread.thread_id
      ) || { is_liked_by_user: 0 };
      const commentCountData = userComments.find(
        (comment) => comment.thread_id === thread.thread_id
      ) || { comment_count: 0 };

      return {
        ...thread,
        like_count: likeCountData.like_count,
        is_liked_by_user: !!userLikeData.is_liked_by_user,
        comment_count: commentCountData.comment_count,
        image_url: thread.image_url || null,
      };
    });

    res.render("index", {
      authenticated: isAuthenticated,
      username: username,
      email: email,
      profile_img: profile_img,
      threads: threadsWithDetails,
    });
  }
});

// Sign up
app.get("/signup", (req, res) => {
  if (!isValidSession(req)) {
    res.render("signup");
  } else {
    res.redirect("/");
  }
});

// app.use("/createTables", sessionValidation);
app.get("/createTables", async (req, res) => {
  try {
    let success = await create_tables.createTables(); // Ensure you're awaiting the async function

    if (success) {
      res.send("Created tables.");
    } else {
      res.send("Failed to create tables.");
    }
  } catch (err) {
    console.error("Error in /createTables route", err);
    res.status(500).send("An error occurred while creating tables.");
  }
});

// signingUp
app.post("/signingUp", upload.single("profile"), async (req, res) => {
  let email = req.body.email;
  let username = req.body.username;
  let password = req.body.password;
  let profile = req.file;

  console.log("profile", profile);
  console.log("username", username);
  console.log("email", email);
  console.log("password", password);

  // Input validation
  if (!email || !username || !password) {
    return res.status(500).send("Please fill in all required fields.");
  }

  // Password validation >= 10 characters with upper/lowercase, numbers, symbols
  const regexUpper = /[A-Z]/;
  const regexLower = /[a-z]/;
  const regexNumber = /[0-9]/;
  const regexSymbol = /[$&+,:;=?@#|'<>.^*()%!-]/;

  if (
    password.length >= 10 &&
    regexUpper.test(password) &&
    regexLower.test(password) &&
    regexNumber.test(password) &&
    regexSymbol.test(password)
  ) {
    try {
      // Check if username or email already exists
      const existingUser = await db_users.checkUserExist({
        email: email,
        username: username,
      });
      // db_users.findUserByEmailOrUsername 함수는 email이나 username으로 사용자 검색을 수행함

      if (existingUser) {
        // If user with the same email or username exists
        return res.status(400).send("Username or Email already exists.");
      }

      // Hash the password
      const hashedPassword = bcrypt.hashSync(password, saltRounds);

      let profileUrl = null;
      if (profile) {
        let image_uuid = uuid();
        let buf64 = req.file.buffer.toString("base64");

        try {
          // profile image upload to Cloudinary
          const result = await cloudinary.uploader.upload(
            "data:image/octet-stream;base64," + buf64,
            { folder: "user_profiles" }, // folder name
            { public_id: image_uuid } // file name
          );

          if (!result.secure_url) {
            return res.render("error", {
              message: "Error uploading the image to Cloudinary",
            });
          }

          profileUrl = result.secure_url; // URL to the uploaded image
        } catch (err) {
          console.error("Cloudinary upload error:", err);
          return res.status(500).send("Failed to upload profile image.");
        }
      }

      // Create new user if email and username are unique
      const success = await db_users.createUser({
        email,
        username,
        hashedPassword,
        profile: profileUrl, // URL to the uploaded image (or null)
      });

      if (success) {
        return res.status(200).send("Successfully created user.");
      } else {
        return res.status(500).send("Error creating the user.");
      }
    } catch (err) {
      console.error("Database error:", err);
      return res.status(500).send("Error saving the user to the database.");
    }
  } else {
    // Password does not meet requirements
    return res
      .status(400)
      .send("Invalid password. Must meet complexity requirements.");
  }
});

// Login
app.get("/login", (req, res) => {
  if (!isValidSession(req)) {
    res.render("login");
  } else {
    res.redirect("/");
  }
});

// Logging in
app.post("/loggingin", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  try {
    let user = await db_users.getUser({
      username: username,
    });

    if (!user) {
      return res.status(404).send("Invalid username or password");
    }

    // there should only be 1 user in the db that matches
    if (bcrypt.compareSync(password, user.password_hash)) {
      req.session.authenticated = true;
      req.session.username = username;
      req.session.user_id = user.user_id;
      req.session.email = user.email;
      req.session.profile_img = user.profile_img;
      req.session.cookie.maxAge = expireTime;
      return res.status(200).send("Login success");
    } else {
      return res.status(404).send("Invalid username or password");
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).send("Server error");
  }
});

// Log out
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

//Profile
app.use("/profile", sessionValidation);
app.get("/profile", async (req, res) => {
  // Check if the user is logged in by verifying the session username
  const username = req.session.username;
  const email = req.session.email;
  const profile_img = req.session.profile_img;
  const user_id = req.session.user_id;

  // console.log("Session username:", req.session.username);
  if (!user_id) {
    return res.redirect("/login");
  }

  try {
    const threads = await db_threads.getMyThreads({ user_id });
    const threadIds = threads.map((thread) => thread.thread_id);

    const postData = {
      threadIds: threadIds,
      user_id: user_id,
    };

    const likeCounts = await db_likes.getLikesForThreads(postData);
    const userLikes = await db_likes.getUserLikesForThreads(postData);
    const userComments = await db_comments.getCommentsForThreads(postData);
    // Fetch comments authored by the user
    const allUserComments = await db_comments.getUserComments(postData);

    // Combine likes, user likes, and comments with threads
    const threadsWithDetails = threads.map((thread) => {
      const likeCountData = likeCounts.find(
        (like) => like.thread_id === thread.thread_id
      ) || { like_count: 0 };
      const userLikeData = userLikes.find(
        (like) => like.thread_id === thread.thread_id
      ) || { is_liked_by_user: 0 };
      const commentCountData = userComments.find(
        (comment) => comment.thread_id === thread.thread_id
      ) || { comment_count: 0 };

      return {
        ...thread,
        like_count: likeCountData.like_count,
        is_liked_by_user: !!userLikeData.is_liked_by_user,
        comment_count: commentCountData.comment_count,
        image_url: thread.image_url || null,
      };
    });

    res.render("profile", {
      username: username,
      email: email,
      profile_img: profile_img,
      threads: threadsWithDetails,
      comments: allUserComments,
    });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).send("An error occurred while loading the profile.");
  }
});

// New thread
app.use("/new-thread", sessionValidation);
app.post("/new-thread", upload.single("image"), async (req, res) => {
  const content = req.body.content;
  const username = req.session.username;
  const user_id = req.session.user_id;
  const email = req.session.email;
  const profile_img = req.session.profile_img;

  if (!username) {
    return res.status(401).send("Unauthorized: Please log in.");
  }

  if (!content && !req.file) {
    return res.status(400).send("Content or an image must be provided.");
  }

  let imageUrl = null;
  if (req.file) {
    try {
      const buf64 = req.file.buffer.toString("base64");
      const result = await cloudinary.uploader.upload(
        "data:image/octet-stream;base64," + buf64,
        { folder: "thread_images" } // optional folder name
      );
      // console.log("Cloudinary upload result:", result);
      imageUrl = result.secure_url; // Store the uploaded image URL
      console.log("Uploaded image URL:", imageUrl);
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      return res.status(500).send("Error uploading the image.");
    }
  }

  try {
    const success = await db_threads.insertThread({
      content: content,
      user_id: user_id,
      image_url: imageUrl, // Save the image URL (if any) with the thread
    });

    if (success) {
      res.redirect("/");
    } else {
      res.status(500).send("Error saving the thread to the database");
    }
  } catch (error) {
    console.error("Error inserting thread:", error);
    res.status(500).send("Error inserting thread");
  }
});

// Add like
app.use("/like", sessionValidation);
app.post("/like", async (req, res) => {
  const thread_id = req.body.thread_id;
  const comment_id = req.body.comment_id;
  const liked = req.body.liked;
  const user_id = req.session.user_id;

  try {
    if (liked) {
      // Add a new like if it doesn't exist
      const [existingLike] = await db_likes.findLike({
        thread_id: thread_id || null,
        comment_id: comment_id || null,
        user_id: user_id,
      });

      if (!existingLike) {
        await db_likes.addLike({
          thread_id: thread_id || null,
          comment_id: comment_id || null,
          user_id: user_id,
        });
      }
    } else {
      await db_likes.removeLike({
        thread_id: thread_id || null,
        comment_id: comment_id || null,
        user_id: user_id,
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating like status:", error);
    res.json({ success: false });
  }
});

// Search
app.get("/search", (req, res) => {
  res.render("search", {
    users: [],
    username: req.session.username,
    email: req.session.email,
    profile_img: req.session.profile_img,
  });
});

// Add comment
app.use("/add-comment", sessionValidation);
app.post("/add-comment", async (req, res) => {
  try {
    const thread_id = req.body.thread_id;
    const parent_comment_id = req.body.parent_comment_id;
    console.log("parent_comment_id:", parent_comment_id);
    const user_id = req.session.user_id;
    const content = req.body.content;

    let depth = 0;

    if (parent_comment_id) {
      const parentDepth = await db_comments.getDepth({
        comment_id: parent_comment_id,
      });
      depth = parentDepth + 1;
    }

    console.log("depth:", depth);
    await db_comments.insertComment({
      thread_id: thread_id,
      parent_comment_id: parent_comment_id || null,
      user_id: user_id,
      content: content,
      depth,
    });

    // Redirect to the thread page
    res.redirect(`/`);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ success: false, message: "Failed to add comment" });
  }
});

app.delete("/delete-comment/:id", async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.session.user_id;
    // console.log("Delete request received for comment ID:", commentId);
    const postData = { comment_id: commentId };

    // Check if the comment belongs to a thread owned by the current user
    const comment = await db_comments.getCommentById(postData); // Retrieve the comment and its associated thread ID
    // console.log("Retrieved comment:", comment);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // if (comment.user_id !== userId) {
    //   return res
    //     .status(403)
    //     .json({ message: "You are not authorized to delete this comment" });
    // }

    // Delete the comment
    await db_comments.deleteCommentById(postData);
    res.sendStatus(200); // Success
  } catch (error) {
    console.error("Error deleting comment:", error);
    res
      .status(500)
      .json({ message: "You are not authorized to delete this comment" }); // Error response
  }
});

//update the comment
app.put("/edit-comment/:id", async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.session.user_id;
    const { content } = req.body;

    // search the comment by id
    const comment = await db_comments.getCommentById({ comment_id: commentId });
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // check if the comment belongs to the current user
    if (comment.user_id !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this comment" });
    }

    // update the comment
    await db_comments.updateCommentById({ comment_id: commentId, content });
    res.sendStatus(200);
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ message: "Failed to update comment" });
  }
});

//stats page
app.use("/stats", sessionValidation);
app.get("/stats", async (req, res) => {
  const threads = await db_threads.getAllActiveThreads();

  const threadIds = threads.map((thread) => thread.thread_id);

  const postData = {
    threadIds: threadIds,
    user_id: req.session.user_id, // Assuming user_id is in session after validation
  };

  const likeCounts = await db_likes.getLikesForThreads(postData);
  const userLikes = await db_likes.getUserLikesForThreads(postData);
  const userComments = await db_comments.getCommentsForThreads(postData);

  // Combine likes, user likes, and comments with threads
  const threadsWithDetails = threads.map((thread) => {
    const likeCountData = likeCounts.find(
      (like) => like.thread_id === thread.thread_id
    ) || { like_count: 0 };
    const userLikeData = userLikes.find(
      (like) => like.thread_id === thread.thread_id
    ) || { is_liked_by_user: 0 };
    const commentCountData = userComments.find(
      (comment) => comment.thread_id === thread.thread_id
    ) || { comment_count: 0 };

    return {
      ...thread,
      like_count: likeCountData.like_count,
      is_liked_by_user: !!userLikeData.is_liked_by_user,
      comment_count: commentCountData.comment_count,
      total_interactions:
        likeCountData.like_count + commentCountData.comment_count, // Calculate total interactions
      image_url: thread.image_url || null,
    };
  });

  // Sort threads by hit_count (view count) in descending order
  threadsWithDetails.sort((a, b) => b.hit_count - a.hit_count);
  res.render("stats", {
    username: req.session.username,
    email: req.session.email,
    profile_img: req.session.profile_img,
    threads: threadsWithDetails,
  });
});

app.use("/thread/:id", sessionValidation);
app.get("/thread/:id", async (req, res) => {
  // Check if the user is logged in by verifying the session data
  const { username, profile_img, user_id } = req.session;

  try {
    const postData = { thread_id: req.params.id };

    // Increment the hit count for the thread
    await db_threads.incrementHitCount(postData);

    // Fetch the specific thread data
    const thread = await db_threads.getThreadById(postData);
    if (!thread) {
      return res.status(404).send("Thread not found");
    }

    // Fetch comments related to this thread
    const comments = await db_comments.getCommentsByThreadId(postData);
    const commentCount = comments.length;

    // Fetch like counts and whether the user has liked the thread
    const likeThreadCounts = await db_likes.getLikesForThreads({
      threadIds: [postData.thread_id],
    });
    const userThreadLikes = await db_likes.getUserLikesForThreads({
      threadIds: [postData.thread_id],
      user_id,
    });

    // For comments, get the like counts and user-specific likes
    const commentIds = comments.map((comment) => comment.comment_id);
    const likeCommentCounts = await db_likes.getLikesForComments({
      commentIds,
    });
    const userCommentLikes = await db_likes.getUserLikesForComments({
      commentIds,
      user_id,
    });

    // Combine the thread data with like and user-like details
    const threadWithDetails = {
      ...thread,
      like_thread_count: likeThreadCounts[0]?.like_count || 0,
      is_thread_liked_by_user: userThreadLikes[0]?.is_liked_by_user || false,
      comment_count: commentCount,
      hit_count: thread.hit_count, // Increment the hit count
    };

    // Add like details to each comment
    comments.forEach((comment) => {
      const likeData = likeCommentCounts.find(
        (like) => like.comment_id === comment.comment_id
      );
      const userLikeData = userCommentLikes.find(
        (like) => like.comment_id === comment.comment_id
      );

      comment.like_comment_count = likeData ? likeData.like_count : 0;
      comment.is_comment_liked_by_user = userLikeData
        ? userLikeData.is_liked_by_user
        : false;
    });

    // Function to build the nested comment tree structure
    function buildCommentTree(comments) {
      const commentMap = {}; // Map to store each comment by its ID
      const rootComments = []; // Array to store top-level comments

      // Populate the commentMap with each comment, adding an empty children array and initializing the comment_count
      comments.forEach((comment) => {
        comment.children = [];
        comment.comment_count = 0; // Initialize the comment count for each comment
        commentMap[comment.comment_id] = comment;
      });

      // Arrange comments into a tree structure and update the comment_count for each parent
      comments.forEach((comment) => {
        if (comment.parent_comment_id) {
          // If comment has a parent, add it to the parent's children array
          const parentComment = commentMap[comment.parent_comment_id];
          if (parentComment) {
            parentComment.children.push(comment);
            incrementCommentCount(parentComment); // Update the parent's comment count
          }
        } else {
          // If no parent, it's a root-level comment
          rootComments.push(comment);
        }
      });

      // Helper function to recursively count child comments
      function incrementCommentCount(comment) {
        comment.comment_count += 1;
        if (comment.parent_comment_id) {
          const parent = commentMap[comment.parent_comment_id];
          if (parent) {
            incrementCommentCount(parent); // Recursively update counts for all ancestors
          }
        }
      }

      return rootComments; // Return only the top-level comments with their children nested
    }

    // Build the nested comment structure
    const nestedComments = buildCommentTree(comments);

    // Render the thread details page with thread data, comments, and user session info
    res.render("threadDetails", {
      thread: threadWithDetails, // Thread data with like info
      comments: nestedComments, // Nested comment structure
      username, // Current user’s username
      profile_img, // Current user’s profile image
      user_id, // Current user’s ID
    });
  } catch (error) {
    console.error("Error fetching thread details:", error);
    res.status(500).send("An error occurred while fetching thread details.");
  }
});

app.put("/edit-thread/:id", async (req, res) => {
  const threadId = req.params.id;
  const { content } = req.body; // 클라이언트로부터 새로운 내용을 받아옵니다.

  try {
    // 게시글 내용 업데이트
    const result = await db_threads.updateThreadContent(threadId, content);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Thread updated successfully" });
    } else {
      res.status(404).json({ message: "Thread not found" });
    }
  } catch (error) {
    console.error("Error updating thread:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the thread" });
  }
});

// Thread 삭제 API
app.delete("/delete-thread/:id", async (req, res) => {
  const threadId = req.params.id;

  try {
    // 게시글 삭제
    const result = await db_threads.deleteThreadById(threadId);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Thread deleted successfully" });
    } else {
      res.status(404).json({ message: "Thread not found" });
    }
  } catch (error) {
    console.error("Error deleting thread:", error);
    res
      .status(500)
      .json({ message: "An error occurred while deleting the thread" });
  }
});

app.get("/search/users", async (req, res) => {
  const keyword = req.query.keyword; // 검색어를 쿼리 파라미터에서 가져옴

  if (!keyword) {
    return res.status(400).send("검색어가 필요합니다.");
  }

  try {
    // DB에서 username이나 email이 검색어와 일치하는 사용자를 검색
    const users = await db_users.searchUsers(keyword); // searchUsers 함수를 별도로 정의해야 합니다.

    if (users.length === 0) {
      console.log("No users found matching the keyword");
      // return res.json([]);
      return res.status(204).json([]);
    }

    res.json(users); // 결과를 JSON 형식으로 반환
  } catch (err) {
    console.log("Error searching for users:", err);
    res.status(500).send("Error searching for users");
  }
});

app.get("/search/threads", async (req, res) => {
  const keyword = req.query.keyword; // 검색어를 쿼리 파라미터에서 가져옴

  if (!keyword) {
    return res.status(400).send("검색어가 필요합니다.");
  }

  try {
    // DB에서 content가 검색어와 일치하거나 포함된 thread 검색
    const threads = await db_threads.searchThreads(keyword); // searchThreads 함수를 별도로 정의해야 합니다.

    if (threads.length === 0) {
      console.log("No threads found matching the keyword");
      return res.status(204).json([]); // 검색 결과가 없을 때 빈 배열 반환
    }

    res.json(threads); // 검색된 thread를 JSON 형식으로 반환
  } catch (err) {
    console.log("Error searching for threads:", err);
    res.status(500).send("Error searching for threads");
  }
});

app.get("/search/comments", async (req, res) => {
  const keyword = req.query.keyword; // 검색어를 쿼리 파라미터에서 가져옴

  if (!keyword) {
    return res.status(400).send("검색어가 필요합니다.");
  }

  try {
    // DB에서 content가 검색어와 일치하거나 포함된 comment 검색
    const comments = await db_comments.getCommentsByKeyword(keyword); // searchComments 함수를 별도로 정의해야 합니다.

    if (comments.length === 0) {
      console.log("No comments found matching the keyword");
      return res.status(204).json([]); // 검색 결과가 없을 때 빈 배열 반환
    }

    res.json(comments); // 검색된 댓글을 JSON 형식으로 반환
  } catch (err) {
    console.log("Error searching for comments:", err);
    res.status(500).send("Error searching for comments");
  }
});

// Serve static files
app.use(express.static(__dirname + "/public"));

//  Catch all other routes and 404s
app.get("*", (req, res) => {
  res.status(404);
  // res.send("Page not found - 404");
  res.render("404");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
