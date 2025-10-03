/*==================== SECTION NAVIGATION ====================*/
function showSection(sectionId) {
  document.querySelectorAll("section").forEach((section) => {
    section.style.display = "none";
  });

  toggleDashboard(false); // Hide dashboard
  toggleAdmin(false); // Hide admin login

  const target = document.getElementById(`${sectionId}-section`);
  if (target) target.style.display = "flex";

  document.querySelectorAll(".navbar a").forEach((link) => {
    link.classList.remove("active");
  });

  const activeLink = document.querySelector(
    `.navbar a[onclick="showSection('${sectionId}')"]`
  );
  if (activeLink) activeLink.classList.add("active");

  localStorage.setItem("activeSection", sectionId);
}

/*==================== ADMIN LOGIN ====================*/
let logoClickCount = 0;
let clickTimer;

document.addEventListener("DOMContentLoaded", () => {
  const logo = document.getElementById("logo");

  if (logo) {
    logo.addEventListener("click", (e) => {
      e.preventDefault();
      logoClickCount++;

      if (logoClickCount === 3) toggleAdmin(true);

      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => (logoClickCount = 0), 2000);
    });
  }

  const loginForm = document.getElementById("admin-login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("admin-username").value;
      const password = document.getElementById("admin-password").value;

      try {
        const response = await fetch("/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          alert(`❌ Server responded with status: ${response.status}`);
          return;
        }

        const data = await response.json();
        if (data.success) {
          toggleAdmin(false);
          showDashboard(data.requests);
        } else {
          document.getElementById("login-error").style.display = "block";
        }
      } catch (error) {
        console.error("❌ Network error:", error);
        alert("❌ Unable to connect to server. Please try again.");
      }
    });
  }
});

/*==================== ADMIN DASHBOARD ====================*/
function toggleAdmin(show) {
  document.getElementById("admin-login-section").style.display = show
    ? "flex"
    : "none";
}

function toggleDashboard(show) {
  const dashboard = document.getElementById("admin-dashboard");
  dashboard.style.display = show ? "block" : "none";
  document.body.classList.toggle("modal-open", show);
}

function showDashboard(requests) {
  toggleDashboard(true);
  localStorage.setItem("activeSection", "admin-dashboard");

  const tableBody = document.querySelector("#hire-requests-table tbody");
  tableBody.innerHTML = "";

  requests.forEach((req) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${req.id}</td>
      <td>${req.name}</td>
      <td><a href="mailto:${req.email}" target="_blank" class="email-link">${req.email}</a></td>
      <td>${req.subject}</td>
      <td>${req.message}</td>
      <td>${req.submitted_at}</td>
    `;
    tableBody.appendChild(row);
  });
}

/*==================== CSV DOWNLOAD ====================*/
function downloadCSV() {
  const rows = document.querySelectorAll("#hire-requests-table tr");
  const csv = Array.from(rows)
    .map((row) => {
      const cols = row.querySelectorAll("td, th");
      return Array.from(cols)
        .map((col) => `"${col.innerText.replace(/"/g, '""')}"`)
        .join(",");
    })
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hire_requests.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/*==================== MODAL FORM ====================*/
function toggleForm(show = true) {
  const modal = document.getElementById("hire-form-modal");
  if (modal) modal.style.display = show ? "flex" : "none";
}

/*==================== hire form  ====================*/
document.addEventListener("DOMContentLoaded", () => {
  // Dashboard restore (if admin)
  const savedSection = localStorage.getItem("activeSection");
  if (savedSection === "admin-dashboard") {
    fetch("/get-requests")
      .then((res) => res.json())
      .then((data) => showDashboard(data.requests))
      .catch(console.error);
  }

  // Hire form modal close
  const hireModal = document.getElementById("hire-form-modal");
  if (hireModal) {
    hireModal.addEventListener("click", (e) => {
      if (e.target === hireModal) toggleForm(false);
    });
  }

  // Show success popup
  const successFlag = document.body.dataset.success;
  const popup = document.getElementById("success-popup");

  if (successFlag === "true" && popup) {
    popup.style.display = "flex";
    setTimeout(() => {
      popup.style.display = "none";
      // Remove ?success=true from URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 3000);
  }
});

/*==================== NAVBAR INTERACTIONS ====================*/
function toggleMenu() {
  document.querySelector(".navbar").classList.toggle("active");
}

document.querySelectorAll(".navbar a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelector(".navbar").classList.remove("active");
  });
});

document.addEventListener("click", (event) => {
  const navbar = document.querySelector(".navbar");
  const hamburger = document.querySelector(".hamburger");
  if (!navbar.contains(event.target) && !hamburger.contains(event.target)) {
    navbar.classList.remove("active");
  }
});

/*==================== UTILS ====================*/
function safeText(text) {
  return text ?? "";
}

/*============= Showing Projects =================*/
document.addEventListener("DOMContentLoaded", () => {
  const projects = [
    "/projects/portfolio",
    "/projects/dashboardvault",
    "/projects/ai-chatbot",
    "/projects/profitanalysis",
    "/projects/cricket",
  ];

  let currentIndex = 0;
  const modal = document.getElementById("projectModal");

  // Attach event listener to project cards
  document.querySelectorAll(".project-card").forEach((card, idx) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(idx);
    });
  });

  // Open modal with project content
  function openModal(index) {
    currentIndex = index;
    loadProject(projects[currentIndex], "right"); // default slide-in from right
    modal.style.display = "flex";
    document.body.style.overflow = "hidden"; // Prevent background scroll
  }

  // Close the modal
  function closeModal() {
    modal.style.display = "none";
    document.body.style.overflow = "auto"; // Restore scroll

    // Optional: scroll back to projects section
    document.getElementById("projects-section").scrollIntoView({
      behavior: "smooth",
    });

    // Optional: Clear modal content
    document.getElementById("modalContent").innerHTML = "";
  }

  // Load content of the selected project with animation direction
  function loadProject(url, direction = "right") {
    // Remove animation direction to reset animation
    modal.removeAttribute("data-direction");

    // Force reflow to restart animation
    void modal.offsetHeight;

    // Set animation direction attribute
    modal.setAttribute("data-direction", direction);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch project");
        return res.text();
      })
      .then((html) => {
        document.getElementById("modalContent").innerHTML = html;

        // Show/hide navigation buttons
        document.getElementById("prevBtn").style.display =
          currentIndex > 0 ? "block" : "none";
        document.getElementById("nextBtn").style.display =
          currentIndex < projects.length - 1 ? "block" : "none";
      })
      .catch((err) => {
        document.getElementById("modalContent").innerHTML =
          "<p>Error loading project.</p>";
        console.error(err);
      });
  }

  // Close modal when clicking the close button
  document
    .getElementById("closeModalBtn")
    .addEventListener("click", closeModal);

  // Navigate to previous project
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      loadProject(projects[currentIndex], "left");
    }
  });

  // Navigate to next project
  document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentIndex < projects.length - 1) {
      currentIndex++;
      loadProject(projects[currentIndex], "right");
    }
  });
});
// filter function
function filterProjects(category) {
  const cards = document.querySelectorAll(".project-card");
  const buttons = document.querySelectorAll(".filter-btn");

  buttons.forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector(`.filter-btn[onclick*="${category}"]`)
    .classList.add("active");

  cards.forEach((card) => {
    const cardCategory = card.getAttribute("data-category");
    if (category === "all" || cardCategory === category) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const mobileWarning = document.getElementById("mobile-warning");

  // Show only if screen width is less than 768px (typical mobile)
  if (window.innerWidth <= 768) {
    mobileWarning.style.display = "block";
  }
});



