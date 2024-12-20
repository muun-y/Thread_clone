CREATE TABLE user (
    user_id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(500) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profil_img VARCHAR(255),
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id),
    UNIQUE INDEX unique_username (username ASC),
    UNIQUE INDEX unique_email (email ASC)
);

CREATE TABLE thread (
    thread_id INT NOT NULL AUTO_INCREMENT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_hit TIMESTAMP,
    user_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (thread_id),
    FOREIGN KEY (user_id) 
        REFERENCES user(user_id)
        ON DELETE CASCADE,
    FULLTEXT(content)  -- full text index for search
);

select * from user;
SELECT * FROM user WHERE username = 'yongeun';

 SELECT * FROM thread;
 
 SELECT t.content, t.created_at, u.email, u.username, u.profile_img
 FROM thread t
 JOIN user u
 ON t.user_id = u.user_id
 WHERE t.is_active = 1 AND u.is_active = 1;
 
 
 CREATE TABLE `like` (
    like_id INT NOT NULL AUTO_INCREMENT,
    created_at TIMESTAMP DEFAULT NOW(),
    user_id INT NOT NULL,
    thread_id INT NOT NULL,
    PRIMARY KEY (like_id),
    FOREIGN KEY (user_id) 
        REFERENCES user(user_id)
        ON DELETE CASCADE,
    FOREIGN KEY (thread_id) 
        REFERENCES thread(thread_id)
        ON DELETE CASCADE
);


select * from `like`;



 SELECT 
      thread_id, 
      COUNT(*) AS like_count
    FROM `like`
    WHERE thread_id IN (3,4)
    GROUP BY thread_id;
    
    
    
    
CREATE TABLE comment (
    comment_id INT NOT NULL AUTO_INCREMENT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    parent_comment_id INT,
    depth INT DEFAULT 0,
    thread_id INT NOT NULL,
    user_id INT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE, -- if deleted, set TRUE
    PRIMARY KEY (comment_id),
    FOREIGN KEY (parent_comment_id) 
        REFERENCES comment(comment_id)
        ON DELETE SET NULL, -- if parent comment is deleted, set NULL
    FOREIGN KEY (thread_id) 
        REFERENCES thread(thread_id)
        ON DELETE CASCADE, -- if thread is deleted, delete all related replies
    FOREIGN KEY (user_id) 
        REFERENCES user(user_id)
        ON DELETE CASCADE  -- if user is deleted, delete all related replies
);

select * from comment;

select * from user;