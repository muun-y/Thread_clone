function handleSearch(query) {
  if (query === "" || query === "@") {
    clearSearchResults();
    return;
  }

  if (query.startsWith("@")) {
    const keyword = query.slice(1);
    if (keyword === "") {
      clearSearchResults();
      document.getElementById("user-search-title").style.display = "none";
      return;
    }
    fetch(`/search/users?keyword=${encodeURIComponent(keyword)}`)
      .then((response) => {
        if (!response.ok) throw new Error("No search results found");
        return response.json();
      })
      .then((data) => {
        document.getElementById("user-search-title").style.display = "block";
        if (data.length === 0) {
          clearSearchResults();
        } else {
          displayUserResults(data);
        }
      })
      .catch((error) => {
        clearSearchResults();
      });
  } else {
    // Thread
    fetch(`/search/threads?keyword=${encodeURIComponent(query)}`)
      .then((response) => {
        if (!response.ok) throw new Error("No search results found");
        return response.json();
      })
      .then((data) => {
        document.getElementById("thread-search-title").style.display = "block";
        if (data.length === 0) {
          clearSearchResults();
        } else {
          displayThreadResults(data);
        }
      })
      .catch((error) => {
        clearSearchResults();
      });

    // Comment
    fetch(`/search/comments?keyword=${encodeURIComponent(query)}`)
      .then((response) => {
        if (!response.ok) throw new Error("No search results found");
        return response.json();
      })
      .then((data) => {
        document.getElementById("comment-search-title").style.display = "block";
        if (data.length === 0) {
          clearSearchResults();
        } else {
          displayCommentResults(data);
        }
      })
      .catch((error) => {
        clearSearchResults();
      });
  }
}

function displayUserResults(users) {
  const resultsContainer = document.getElementById("user-search-results");
  const template = document.getElementById("user-template");

  // previous search results delete
  resultsContainer.innerHTML = "";

  users.forEach((user) => {
    // Clone the template content
    const userElement = template.content.cloneNode(true);

    // Profile image setting
    const profileImg = userElement.querySelector(".profile-img");
    const placeholderImg = userElement.querySelector(".placeholder-img");
    if (user.profile_img) {
      profileImg.src = user.profile_img;
      profileImg.alt = user.username;
      placeholderImg.classList.add("hidden");
    } else {
      profileImg.classList.add("hidden");
      placeholderImg.classList.remove("hidden");
    }

    // User information setting
    userElement.querySelector(".username").textContent = user.username;
    userElement.querySelector(".bio").textContent = user.bio || "";
    userElement.querySelector(".followers-count").textContent = `${
      user.followers_count || 0
    } followers`;

    // Result container append
    resultsContainer.appendChild(userElement);
  });
}

function displayThreadResults(threads) {
  const resultsContainer = document.getElementById("thread-search-results");
  const template = document.getElementById("thread-template");

  resultsContainer.innerHTML = "";

  threads.forEach((thread) => {
    const threadElement = template.content.cloneNode(true);

    const threadLink = threadElement.querySelector(".thread-link");
    threadLink.href = `/thread/${thread.thread_id}`;

    const profileImg = threadElement.querySelector(".profile-img");
    const placeholderImg = threadElement.querySelector(".placeholder-img");
    if (thread.profile_img) {
      console.log("profileImg.src:", profileImg.src);
      profileImg.src = thread.profile_img;
      profileImg.alt = thread.username;
      placeholderImg.classList.add("hidden");
    } else {
      profileImg.classList.add("hidden");
      placeholderImg.classList.remove("hidden");
    }

    const createdAtDate = new Date(thread.created_at).toLocaleDateString();
    threadElement.querySelector(".username").innerHTML = `
  ${thread.username} <span class="ml-3 text-gray-300 created-at text-sm">${createdAtDate}</span>
`;
    threadElement.querySelector(".content").textContent = thread.content;

    const threadImageContainer = threadElement.querySelector(
      ".thread-image-container"
    );
    if (thread.image_url) {
      const threadImg = threadElement.querySelector(".thread-img");
      threadImg.src = thread.image_url;
      threadImageContainer.classList.remove("hidden");
    } else {
      threadImageContainer.classList.add("hidden");
    }

    threadElement.querySelector(".like-count").textContent =
      thread.like_count || 0;
    threadElement.querySelector(".comment-count").textContent =
      thread.comment_count || 0;

    resultsContainer.appendChild(threadElement);
  });
}

function displayCommentResults(comments) {
  const resultsContainer = document.getElementById("comment-search-results");
  const template = document.getElementById("comment-template");

  resultsContainer.innerHTML = ""; // 기존 검색 결과 삭제

  comments.forEach((comment) => {
    const commentElement = template.content.cloneNode(true);

    const profileImg = commentElement.querySelector(".profile-img");
    const placeholderImg = commentElement.querySelector(".placeholder-img");
    if (comment.profile_img) {
      profileImg.src = comment.profile_img;
      profileImg.alt = comment.username;
      placeholderImg.classList.add("hidden");
    } else {
      profileImg.classList.add("hidden");
      placeholderImg.classList.remove("hidden");
    }

    const createdAtDate = new Date(comment.created_at).toLocaleDateString();
    commentElement.querySelector(".username").innerHTML = `
      ${comment.username} <span class="ml-3 text-gray-300 created-at text-sm">${createdAtDate}</span>
    `;
    commentElement.querySelector(".content").textContent = comment.content;

    resultsContainer.appendChild(commentElement);
  });
}

function clearSearchResults() {
  const userResultsContainer = document.getElementById("user-search-results");
  userResultsContainer.innerHTML = "";
  document.getElementById("user-search-title").style.display = "none";

  const threadResultsContainer = document.getElementById(
    "thread-search-results"
  );
  threadResultsContainer.innerHTML = "";
  document.getElementById("thread-search-title").style.display = "none";

  const commentResultsContainer = document.getElementById(
    "comment-search-results"
  );
  commentResultsContainer.innerHTML = "";
  document.getElementById("comment-search-title").style.display = "none";
}
