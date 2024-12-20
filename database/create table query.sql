-- User table
CREATE TABLE user (
    user_id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    -- profile_img VARCHAR(255),
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id),
    UNIQUE INDEX unique_username (username ASC),
    UNIQUE INDEX unique_email (email ASC)
);



-- Thread table
CREATE TABLE thread (
    thread_id INT NOT NULL AUTO_INCREMENT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_hit TIMESTAMP,
    user_id INT NOT NULL,
    image_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    hit_count INT DEFAULT 0,
    PRIMARY KEY (thread_id),
    FOREIGN KEY (user_id) 
        REFERENCES user(user_id)
        ON DELETE CASCADE,
    FULLTEXT(content)  -- full text index for search
);

ALTER TABLE thread
ADD COLUMN hit_count INT DEFAULT 0;

-- full text search query
-- SELECT *
-- FROM thread
-- WHERE MATCH(content) AGAINST('word');

-- SELECT *
-- FROM thread
-- WHERE MATCH(content) AGAINST('+word1 -word2' IN BOOLEAN MODE);

CREATE TABLE hashtags (
    hashtag_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,  -- unique hashtag name
    PRIMARY KEY (hashtag_id)
);

CREATE TABLE thread_hashtags (
    thread_id INT NOT NULL,
    hashtag_id INT NOT NULL,
    PRIMARY KEY (thread_id, hashtag_id), -- composite primary key
    FOREIGN KEY (thread_id) 
        REFERENCES thread(thread_id)
        ON DELETE CASCADE, -- when thread is deleted, delete all related hashtags
    FOREIGN KEY (hashtag_id) 
        REFERENCES hashtags(hashtag_id)
        ON DELETE CASCADE   -- when hashtag is deleted, delete all related threads
);

CREATE INDEX idx_hashtag_name ON hashtags(name);

CREATE INDEX idx_thread_hashtag ON thread_hashtags(thread_id, hashtag_id);


-- new hashtag
-- INSERT INTO hashtags (name) VALUES ('#example'), ('#tutorial');

-- -- add hashtags to thread
-- INSERT INTO thread_hashtags (thread_id, hashtag_id)
-- VALUES (1, (SELECT hashtag_id FROM hashtags WHERE name = '#example')),
--        (1, (SELECT hashtag_id FROM hashtags WHERE name = '#tutorial'));

-- SELECT t.*
-- FROM thread t
-- JOIN thread_hashtags th ON t.thread_id = th.thread_id
-- JOIN hashtags h ON th.hashtag_id = h.hashtag_id
-- WHERE h.name = '#example';

-- Comment table with logical deletion
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
        ON DELETE CASCADE, 
     FULLTEXT (content)
);

-- SELECT CASE 
--          WHEN is_deleted = TRUE THEN 'deleted reply'
--          ELSE content 
--        END AS content
-- FROM reply
-- WHERE thread_id = 10;

-- Like table
CREATE TABLE `like` (
    like_id INT NOT NULL AUTO_INCREMENT,
    created_at TIMESTAMP DEFAULT NOW(),
    user_id INT NOT NULL,
    thread_id INT,
    comment_id INT DEFAULT NULL,
    PRIMARY KEY (like_id),
    FOREIGN KEY (user_id) 
        REFERENCES user(user_id)
        ON DELETE CASCADE,
    FOREIGN KEY (thread_id) 
        REFERENCES thread(thread_id)
        ON DELETE CASCADE,
    FOREIGN KEY (comment_id) 
        REFERENCES comment(comment_id)
        ON DELETE CASCADE
);

alter table `like`
add column comment_id int default null;

-- Follow table
CREATE TABLE follow (
    follow_id INT NOT NULL AUTO_INCREMENT,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follow_id),
    FOREIGN KEY (follower_id) 
        REFERENCES user(user_id)
        ON DELETE CASCADE,
    FOREIGN KEY (following_id) 
        REFERENCES user(user_id)
        ON DELETE CASCADE
);

-- Image table
CREATE TABLE image (
    image_id INT NOT NULL AUTO_INCREMENT,
    url VARCHAR(255) NOT NULL,
    type ENUM('profile', 'thread') NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    user_id INT NOT NULL,
    PRIMARY KEY (image_id),
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);



-- CREATE TABLE image (
--     image_id INT NOT NULL AUTO_INCREMENT,
--     image_url VARCHAR(255) NOT NULL,
--     thread_id INT,
--     user_progu INT,
--     PRIMARY KEY (image_id),
--     FOREIGN KEY (thread_id) REFERENCES thread(thread_id) ON DELETE CASCADE,
--     FOREIGN KEY (profile_id) REFERENCES user(user_id) ON DELETE CASCADE,
--     CHECK (
--         (thread_id IS NOT NULL AND profile_id IS NULL) OR
--         (thread_id IS NULL AND profile_id IS NOT NULL)
--     )
-- );