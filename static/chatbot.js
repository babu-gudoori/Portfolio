window.onload = () => {
  const chatBox = document.getElementById("chat-box");
  const input = document.getElementById("user-input");
  const chatbotContainer = document.querySelector(".chatbot-container");
  const chatbotBox = document.getElementById("chatbotBox");
  let hasWelcomed = false;

  // Toggle chatbot visibility
  window.toggleChatbot = () => {
    const isOpening = chatbotBox.style.display !== "flex";
    chatbotBox.style.display = isOpening ? "flex" : "none";

    if (isOpening && !hasWelcomed) {
      setTimeout(() => {
        appendMessage(
          "bot",
          "👋 Hello! I'm <strong>Riya</strong>, Babu's smart assistant. Ask me anything about his <em>skills, projects, dashboards</em>, or <em>contact info</em>!"
        );
      }, 300);
      hasWelcomed = true;
    }
  };

  // Send message
  window.sendMessage = async () => {
    const userText = input.value.trim();
    if (!userText) return;

    appendMessage("user", userText);
    input.value = "";
    showTypingIndicator();

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();
      removeTypingIndicator();
      appendMessage("bot", data.response);
    } catch (err) {
      removeTypingIndicator();
      appendMessage("bot", "❌ Sorry, something went wrong. Try again later.");
    }
  };

  // Append message
  function appendMessage(sender, text) {
    const message = document.createElement("div");
    message.className = sender === "user" ? "user-msg" : "bot-msg";
    message.style.opacity = 0;
    message.style.transition = "opacity 0.4s ease-in";
    message.innerHTML = sender === "bot" ? text : `<span>${text}</span>`;
    chatBox.appendChild(message);
    setTimeout(() => (message.style.opacity = 1), 50);
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
  }

  function showTypingIndicator() {
    const typing = document.createElement("div");
    typing.className = "bot-msg typing-indicator";
    typing.id = "typing";
    typing.textContent = "Riya is typing...";
    chatBox.appendChild(typing);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function removeTypingIndicator() {
    const typing = document.getElementById("typing");
    if (typing) typing.remove();
  }

  // Close chatbot if clicked outside (excluding the toggle button)
  document.addEventListener("click", (event) => {
    if (
      chatbotBox.style.display === "flex" &&
      !chatbotContainer.contains(event.target) &&
      !event.target.closest(".chatbot-toggle")
    ) {
      chatbotBox.style.display = "none";
    }
  });
};

