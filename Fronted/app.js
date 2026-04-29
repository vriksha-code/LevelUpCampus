const TOKEN_KEY = "levelupCampusToken";
const USER_KEY = "levelupCampusUser";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "/Login.html";
}

function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(path, {
    ...options,
    headers,
  }).then(async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = typeof payload === "string"
        ? payload
        : payload?.message || "Request failed";
      throw new Error(message);
    }

    return payload;
  });
}

function setMessage(element, message, tone = "neutral") {
  if (!element) {
    return;
  }

  const tones = {
    neutral: "text-slate-400",
    success: "text-cyan-300",
    error: "text-red-300",
  };

  element.textContent = message;
  element.className = `text-sm ${tones[tone] || tones.neutral}`;
}

function bindOtpInputs(inputs, onChange) {
  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 1);
      if (input.value && inputs[index + 1]) {
        inputs[index + 1].focus();
      }
      onChange();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && inputs[index - 1]) {
        inputs[index - 1].focus();
      }
    });
  });
}

function initLoginPage() {
  const emailInput = document.getElementById("email");
  const sendButton = document.getElementById("send-otp-button");
  const verifyButton = document.getElementById("verify-otp-button");
  const resendButton = document.getElementById("resend-otp-button");
  const changeEmailButton = document.getElementById("change-email-button");
  const statusText = document.getElementById("otp-status");
  const messageText = document.getElementById("auth-message");
  const otpInputs = Array.from(document.querySelectorAll(".otp-digit"));

  let otpRequested = false;
  let cooldownTimer = null;

  const syncVerifyState = () => {
    verifyButton.disabled = otpInputs.some((input) => !input.value.trim());
  };

  const setCooldown = (seconds) => {
    clearInterval(cooldownTimer);
    let remaining = seconds;
    resendButton.disabled = true;

    resendButton.textContent = `Resend Code (${remaining}s)`;
    cooldownTimer = setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        resendButton.disabled = false;
        resendButton.textContent = "Resend Code";
        return;
      }

      resendButton.textContent = `Resend Code (${remaining}s)`;
    }, 1000);
  };

  const resetOtp = () => {
    otpRequested = false;
    otpInputs.forEach((input) => {
      input.value = "";
    });
    syncVerifyState();
    statusText.textContent = "Waiting for code...";
    resendButton.disabled = false;
    resendButton.textContent = "Resend Code (45s)";
    setMessage(messageText, "");
  };

  bindOtpInputs(otpInputs, syncVerifyState);
  syncVerifyState();

  sendButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email) {
      setMessage(messageText, "Enter your official college email.", "error");
      emailInput.focus();
      return;
    }

    try {
      sendButton.disabled = true;
      setMessage(messageText, "Sending OTP...", "neutral");

      const response = await apiFetch("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      otpRequested = true;
      statusText.textContent = "OTP sent";
      setMessage(messageText, response.message, "success");
      setCooldown(response.cooldownSeconds || 60);
      otpInputs[0]?.focus();
    } catch (error) {
      setMessage(messageText, error.message, "error");
    } finally {
      sendButton.disabled = false;
    }
  });

  verifyButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const otp = otpInputs.map((input) => input.value.trim()).join("");

    if (!otpRequested) {
      setMessage(messageText, "Request an OTP first.", "error");
      return;
    }

    if (otp.length !== otpInputs.length) {
      setMessage(messageText, "Enter the 6-digit OTP.", "error");
      return;
    }

    try {
      verifyButton.disabled = true;
      setMessage(messageText, "Verifying OTP...", "neutral");

      const response = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });

      setToken(response.token);
      setUser(response.user);
      window.location.href = "/Dashboard.html";
    } catch (error) {
      setMessage(messageText, error.message, "error");
      verifyButton.disabled = false;
    }
  });

  resendButton.addEventListener("click", () => {
    sendButton.click();
  });

  changeEmailButton.addEventListener("click", resetOtp);
}

function applyBindings(values) {
  Object.entries(values).forEach(([key, value]) => {
    document.querySelectorAll(`[data-bind="${key}"]`).forEach((element) => {
      if (element.tagName === "IMG") {
        element.src = value;
      } else {
        element.textContent = value;
      }
    });
  });
}

function renderRoadmapLevelCard(level, index) {
  if (!level) {
    return "";
  }

  const cardStyles = [
    "border-white/5 grayscale opacity-80",
    "border-white/5 grayscale opacity-50",
    "border-white/5 grayscale opacity-30",
  ];
  const iconStyles = [
    "text-slate-500",
    "text-slate-600",
    "text-slate-700",
  ];
  const lockStyles = [
    "text-slate-500",
    "text-slate-600 uppercase",
    "text-slate-700",
  ];
  const icons = ["workspace_premium", "diamond", "auto_awesome"];

  return `
    <div class="min-w-[240px] glass-card rounded-2xl p-6 ${cardStyles[index] || cardStyles[cardStyles.length - 1]}">
      <span class="material-symbols-outlined ${iconStyles[index] || iconStyles[iconStyles.length - 1]} text-3xl mb-4">${icons[index] || icons[icons.length - 1]}</span>
      <h4 class="font-h3-title text-sm text-white">Level ${level.level}</h4>
      <p class="text-xs text-slate-400 mb-4">${level.title}</p>
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-xs ${lockStyles[index] || lockStyles[lockStyles.length - 1]}">lock</span>
        <div class="text-[10px] ${lockStyles[index] || lockStyles[lockStyles.length - 1]} font-bold tracking-widest">LOCKED</div>
      </div>
    </div>
  `;
}

function syncDashboardAfterXpAward(payload) {
  const currentLevel = Number(payload?.data?.currentLevel || 1);
  const currentTitle = payload?.data?.levelTitle || "";
  const currentXP = Number(payload?.data?.currentXP || payload?.data?.totalXP || 0);
  const requiredXP = Number(payload?.data?.requiredXP || 100);
  const progressPercent = Number(payload?.data?.progressPercent || 0);

  applyBindings({
    "current-xp": Number(currentXP).toLocaleString(),
    "required-xp": Number(requiredXP).toLocaleString(),
    "level-title": `Level ${currentLevel} – ${currentTitle}`,
    "roadmap-current-level": `Level ${currentLevel}`,
    "roadmap-current-title": currentTitle,
  });

  const progressBar = document.querySelector('[data-bind="progress-bar"]');
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
  }

  if (payload?.data?.leveledUp) {
    window.setTimeout(() => window.location.reload(), 900);
  }
}

async function initDashboardPage() {
  if (!getToken()) {
    window.location.href = "/Login.html";
    return;
  }

  try {
    const response = await apiFetch("/api/dashboard");
    const data = response.data;
    const totalXP = Number(data.level?.totalXP ?? 0);
    const currentLevel = Number(data.level?.current ?? 1);
    const displayLevel = Number.isFinite(currentLevel) && currentLevel > 0 ? currentLevel : 1;
    const displayLevelTitle = data.level?.title || (displayLevel === 1 ? "Freshman" : "Student");

    applyBindings({
      "profile-name": data.profile.name,
      "profile-email": data.profile.collegeEmail,
      "level-title": `Level ${displayLevel} – ${displayLevelTitle}`,
      "current-xp": Number(data.level.currentXP ?? totalXP).toLocaleString(),
      "required-xp": Number(data.level.requiredXP ?? 100).toLocaleString(),
      "roadmap-current-level": `Level ${displayLevel}`,
      "roadmap-current-title": displayLevelTitle,
      "streak-current": data.streak.current,
      "rank-position": `#${data.rank.position}`,
      avatar: data.profile.avatar || document.querySelector('[data-bind="avatar"]')?.src,
    });

    const progressBar = document.querySelector('[data-bind="progress-bar"]');
    if (progressBar) {
      progressBar.style.width = `${data.level.progressPercent}%`;
    }

    // Calendar button navigation
    document.querySelectorAll('[data-view-calendar]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.location.href = '/Calendar.html';
      });
    });

    // Award XP buttons on tasks
    document.querySelectorAll('[data-award-xp]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!getToken()) {
          window.location.href = '/Login.html';
          return;
        }

        const amount = Number(btn.dataset.xpAmount || 0);
        const source = btn.dataset.xpSource || 'task';
        const sourceCode = btn.dataset.xpSourceCode || 'task';
        if (!amount || amount <= 0) return;

        try {
          btn.disabled = true;
          const payload = await apiFetch('/api/xp/add', {
            method: 'POST',
            body: JSON.stringify({ amount, source: sourceCode, description: `Completed: ${source}` }),
          });

          syncDashboardAfterXpAward(payload);

          // Show quick success
          const msg = document.createElement('div');
          msg.className = 'fixed bottom-24 right-6 rounded-lg bg-cyan-700/80 px-4 py-2 text-sm text-white';
          msg.textContent = `+${amount} XP awarded`;
          document.body.appendChild(msg);
          setTimeout(() => msg.remove(), 2200);
        } catch (err) {
          const msg = document.createElement('div');
          msg.className = 'fixed bottom-24 right-6 rounded-lg bg-red-700/80 px-4 py-2 text-sm text-white';
          msg.textContent = err.message || 'Failed to award XP';
          document.body.appendChild(msg);
          setTimeout(() => msg.remove(), 3500);
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Quiz modal handlers
    const quizModal = document.getElementById('quiz-modal');
    const quizQuestionEl = document.getElementById('quiz-question');
    const quizInput = document.getElementById('quiz-answer-input');
    const quizSubmit = document.getElementById('quiz-submit');
    const quizClose = document.getElementById('quiz-close');
    const quizCancel = document.getElementById('quiz-cancel');
    const quizFeedback = document.getElementById('quiz-feedback');

    document.querySelectorAll('[data-open-quiz]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (!quizModal) return;
        const q = b.dataset.quizQuestion || 'Question?';
        quizQuestionEl.textContent = q;
        quizInput.value = '';
        quizFeedback.textContent = '';
        quizModal.dataset.expected = (b.dataset.quizAnswer || '').trim();
        quizModal.dataset.xpAmount = b.dataset.xpAmount || '0';
        quizModal.dataset.xpSource = b.dataset.xpSource || 'quiz';
        quizModal.classList.remove('hidden');
        quizInput.focus();
      });
    });

    const closeQuiz = () => {
      if (!quizModal) return;
      quizModal.classList.add('hidden');
      delete quizModal.dataset.expected;
      delete quizModal.dataset.xpAmount;
      delete quizModal.dataset.xpSource;
      quizFeedback.textContent = '';
    };

    quizClose?.addEventListener('click', closeQuiz);
    quizCancel?.addEventListener('click', closeQuiz);

    quizSubmit?.addEventListener('click', async () => {
      if (!quizModal) return;
      const expected = (quizModal.dataset.expected || '').toLowerCase().trim();
      const entered = (quizInput.value || '').toLowerCase().trim();
      if (!entered) {
        quizFeedback.textContent = 'Please enter an answer.';
        quizFeedback.className = 'text-sm text-yellow-300';
        return;
      }

      if (entered !== expected) {
        quizFeedback.textContent = 'Incorrect — try again.';
        quizFeedback.className = 'text-sm text-red-300';
        return;
      }

      // correct — award XP
      const amount = Number(quizModal.dataset.xpAmount || 0);
      const source = quizModal.dataset.xpSource || 'quiz';
      try {
        quizSubmit.disabled = true;
        const payload = await apiFetch('/api/xp/add', {
          method: 'POST',
          body: JSON.stringify({ amount, source: 'quiz', description: `Quiz: ${quizQuestionEl.textContent}` }),
        });

        syncDashboardAfterXpAward(payload);

        quizFeedback.textContent = `Correct! +${amount} XP awarded.`;
        quizFeedback.className = 'text-sm text-cyan-300';
        setTimeout(closeQuiz, 1200);
      } catch (err) {
        quizFeedback.textContent = err.message || 'Failed to award XP';
        quizFeedback.className = 'text-sm text-red-300';
      } finally {
        quizSubmit.disabled = false;
      }
    });

    document.querySelectorAll("[data-join-study-session]").forEach((button) => {
      button.addEventListener("click", () => {
        window.location.href = "/Community.html?room=peer-help";
      });
    });

    const upcomingRoadmapContainer = document.querySelector("[data-roadmap-upcoming]");
    if (upcomingRoadmapContainer) {
      upcomingRoadmapContainer.innerHTML = (data.level.upcomingLevels || [])
        .slice(0, 3)
        .map((level, index) => renderRoadmapLevelCard(level, index))
        .join("");
    }
  } catch (error) {
    if (error.message.includes("Token expired") || error.message.includes("Invalid token") || error.message.includes("Access denied")) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = "/Login.html";
      return;
    }

    const fallbackMessage = document.createElement("p");
    fallbackMessage.className = "fixed bottom-4 right-4 rounded-2xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-100 backdrop-blur-md";
    fallbackMessage.textContent = `Dashboard failed to load: ${error.message}`;
    document.body.appendChild(fallbackMessage);
  }
}

function wireNavigationLinks() {
  const routeMap = {
    Dashboard: "/Dashboard.html",
    Leaderboard: "/Leaderboard.html",
    Community: "/Community.html",
    Rewards: "/Rewards.html",
    Profile: "/Profile.html",
  };

  document.querySelectorAll("header a, header button, nav a, nav button").forEach((element) => {
    const label = (element.querySelector("span:last-of-type")?.textContent || element.textContent)
      .replace(/\s+/g, " ")
      .trim();
    const route = routeMap[label];

    if (!route) {
      return;
    }

    if (element.tagName === "A") {
      element.href = route;
      return;
    }

    if (!element.dataset.navBound) {
      element.dataset.navBound = "true";
      element.style.cursor = "pointer";
      element.addEventListener("click", () => {
        window.location.href = route;
      });
    }
  });
}

function renderLeaderboardRow(entry, highlight = false) {
  const avatar = entry.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(entry.name || "Student")}`;
  const levelLabel = entry.levelTitle ? `Level ${entry.currentLevel} • ${entry.levelTitle}` : `Level ${entry.currentLevel || 1}`;
  const streak = entry.dailyStreak ?? 0;

  return `
    <tr class="${highlight ? "bg-indigo-500/15 border-l-4 border-l-cyan-400" : "hover:bg-white/5 transition-colors"}">
      <td class="px-6 py-5 font-stat-value ${highlight ? "text-cyan-400" : "text-slate-400"}">#${entry.rank}</td>
      <td class="px-6 py-5">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-full overflow-hidden border ${highlight ? "border-indigo-400" : "border-white/10"}">
            <img alt="Student Avatar" class="w-full h-full object-cover" src="${avatar}" />
          </div>
          <div>
            <p class="font-bold text-white">${entry.name || "Student"}</p>
            <p class="text-xs ${highlight ? "text-indigo-300/70" : "text-slate-500"}">${levelLabel}</p>
          </div>
        </div>
      </td>
      <td class="px-6 py-5 text-center font-bold ${highlight ? "text-white" : "text-slate-300"}">${Number(entry.totalXP || 0).toLocaleString()}</td>
      <td class="px-6 py-5">
        <div class="flex items-center justify-center gap-1 ${streak > 0 ? "text-orange-400" : "text-slate-500"}">
          <span class="material-symbols-outlined text-sm">local_fire_department</span>
          <span class="font-bold">${streak}d</span>
        </div>
      </td>
      <td class="px-6 py-5 text-right text-green-400 font-bold">${entry.weeklyXP != null ? `+${entry.weeklyXP}` : ""}</td>
    </tr>
  `;
}

function updatePodiumSlot(slotNumber, entry) {
  const card = document.querySelector(`[data-podium-card="${slotNumber}"]`);
  if (!card || !entry) {
    return;
  }

  const avatar = card.querySelector("[data-podium-avatar]");
  const name = card.querySelector("[data-podium-name]");
  const level = card.querySelector("[data-podium-level]");
  const rank = card.querySelector("[data-podium-rank]");

  if (avatar) avatar.src = entry.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(entry.name || "Student")}`;
  if (name) name.textContent = entry.name || "Student";
  if (level) level.textContent = `Level ${entry.currentLevel || 1}`;
  if (rank) rank.textContent = String(entry.rank || slotNumber);
}

async function initLeaderboardPage() {
  if (!getToken()) {
    window.location.href = "/Login.html";
    return;
  }

  try {
    const response = await apiFetch("/api/leaderboard/weekly?limit=10");
    const entries = response.data?.leaderboard || [];
    const body = document.querySelector("[data-leaderboard-body]");

    updatePodiumSlot(1, entries[0]);
    updatePodiumSlot(2, entries[1]);
    updatePodiumSlot(3, entries[2]);

    if (body) {
      const myRank = response.data?.myRank;
      body.innerHTML = entries.map((entry) => renderLeaderboardRow(entry, myRank != null && entry.rank === myRank)).join("");
    }

    const myRankLabel = document.querySelector("[data-leaderboard-my-rank]");
    if (myRankLabel && response.data?.myRank != null) {
      myRankLabel.textContent = `#${response.data.myRank}`;
    }
  } catch (error) {
    const fallbackMessage = document.createElement("p");
    fallbackMessage.className = "mx-auto mt-6 max-w-xl rounded-2xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-100 backdrop-blur-md";
    fallbackMessage.textContent = `Leaderboard failed to load: ${error.message}`;
    document.body.appendChild(fallbackMessage);
  }
}

async function initCalendarPage() {
  if (!getToken()) {
    window.location.href = '/Login.html';
    return;
  }

  try {
    const resp = await apiFetch('/api/xp/history?limit=200');
    const entries = resp.data?.history || [];

    const datesWithXP = new Set(entries.map((e) => new Date(e.earnedAt).toISOString().slice(0, 10)));

    const root = document.getElementById('calendar-root');
    if (!root) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Add weekday headers
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    root.innerHTML = weekdays.map(d=>`<div class="text-xs text-slate-400 text-center py-2">${d}</div>`).join('');

    // Empty slots before month start
    for (let i = 0; i < startWeekday; i++) {
      const el = document.createElement('div');
      el.className = 'h-20';
      root.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(year, month, d).toISOString().slice(0,10);
      const hasXP = datesWithXP.has(dateStr);

      const cell = document.createElement('div');
      cell.className = `h-20 p-2 rounded-lg flex flex-col items-start justify-between ${hasXP ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-white/2'} `;
      cell.innerHTML = `<div class="text-sm text-slate-300">${d}</div><div class="text-xs text-slate-400">${hasXP ? 'XP earned' : ''}</div>`;
      root.appendChild(cell);
    }
  } catch (err) {
    const root = document.getElementById('calendar-root');
    if (root) root.innerHTML = `<div class="text-red-400">Failed to load calendar: ${err.message}</div>`;
  }
}

function renderCommunityMessage(message) {
  const avatar = message.sender?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(message.sender?.name || "Student")}`;
  const time = new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const replyMarkup = message.replyTo?.content
    ? `
      <div class="bg-white/5 border-l-4 border-indigo-500 p-2 text-xs text-slate-300 italic mx-2 mt-2 rounded">
        <div class="font-bold text-indigo-300 not-italic">${message.replyTo.senderName || "Student"}</div>
        <div class="line-clamp-2">${message.replyTo.content}</div>
      </div>
    `
    : "";

  return `
    <div class="flex gap-4 max-w-[80%]" data-message-id="${message._id || message.id || ""}">
      <img class="w-10 h-10 rounded-full flex-shrink-0" src="${avatar}" alt="${message.sender?.name || "Student"}" />
      <div class="space-y-1">
        <div class="flex items-baseline gap-2">
          <span class="text-sm font-bold text-indigo-400">${message.sender?.name || "Student"}</span>
          <span class="text-[10px] text-slate-500">${time}</span>
        </div>
        <div class="bg-surface-container-high rounded-2xl rounded-tl-none p-4 text-on-surface border border-white/5">
          ${replyMarkup}
          <div>${message.content}</div>
        </div>
        <button class="text-xs text-indigo-400 font-bold hover:underline flex items-center gap-1 mt-1" data-community-reply-button type="button" data-reply-id="${message._id || message.id || ""}" data-reply-name="${message.sender?.name || "Student"}" data-reply-content="${String(message.content || "").replace(/"/g, '&quot;')}">
          <span class="material-symbols-outlined text-[14px]">reply</span> Reply
        </button>
      </div>
    </div>
  `;
}

function formatRoomTitle(room) {
  const titles = {
    general: "General Chat",
    announcements: "Discussion",
    "peer-help": "Peer Help",
    random: "Random",
  };

  return titles[room] || "General Chat";
}

function scrollCommunityChatToBottom(container) {
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function renderCommunityPost(post) {
  const tags = Array.isArray(post.tags) ? post.tags.slice(0, 2) : [];
  const tagMarkup = tags.map((tag, index) => {
    const classes = ["px-2 py-0.5 text-[10px] font-bold rounded uppercase"];
    classes.push(index === 0 ? "bg-cyan-400/10 text-cyan-400" : "bg-secondary/10 text-secondary");
    return `<span class="${classes.join(" ")}">${tag}</span>`;
  }).join("");

  return `
    <div class="glass-card p-md rounded-2xl group hover:border-indigo-500/50 transition-all">
      <div class="flex gap-2 mb-3">${tagMarkup || `<span class="px-2 py-0.5 bg-cyan-400/10 text-cyan-400 text-[10px] font-bold rounded uppercase">${post.category || "general"}</span>`}</div>
      <h4 class="font-h3-title text-on-surface mb-4 group-hover:text-indigo-400 transition-colors">${post.title}</h4>
      <div class="flex items-center justify-between border-t border-white/5 pt-4">
        <div class="flex items-center gap-2">
          <img class="w-6 h-6 rounded-full border border-slate-900" src="${post.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(post.author?.name || "Student")}`}" alt="${post.author?.name || "Student"}" />
          <span class="text-xs text-slate-500">${post.author?.name || "Student"}</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1 text-slate-400 text-xs"><span class="material-symbols-outlined text-[16px]">forum</span> ${post.views ?? 0}</span>
          <span class="flex items-center gap-1 text-cyan-400 text-xs font-bold"><span class="material-symbols-outlined text-[16px]">thumb_up</span> ${post.upvoteCount ?? 0}</span>
        </div>
      </div>
    </div>
  `;
}

async function initCommunityPage() {
  if (!getToken()) {
    window.location.href = "/Login.html";
    return;
  }

  try {
    const [postsResponse, chatResponse] = await Promise.all([
      apiFetch("/api/community/posts?limit=4&sort=latest"),
      apiFetch("/api/community/chat/history?room=general&limit=8"),
    ]);
    const [meResponse, dashboardResponse] = await Promise.all([
      apiFetch("/api/auth/me"),
      apiFetch("/api/dashboard"),
    ]);

    const postsContainer = document.querySelector("[data-community-posts]");
    const chatContainer = document.querySelector("[data-community-chat]");
    const statusLabel = document.querySelector("[data-community-status]");
    const messageInput = document.querySelector("[data-community-message-input]");
    const sendButton = document.querySelector("[data-community-send-button]");
    const replyPreview = document.querySelector("[data-community-reply-preview]");
    const replyName = document.querySelector("[data-community-reply-name]");
    const replySnippet = document.querySelector("[data-community-reply-snippet]");
    const replyCancel = document.querySelector("[data-community-reply-cancel]");
    const profileTrigger = document.querySelector("[data-community-profile-trigger]");
    const profileModal = document.querySelector("[data-community-profile-modal]");
    const profileCloseButtons = Array.from(document.querySelectorAll("[data-community-profile-close]"));
    const logoutButton = document.querySelector("[data-community-logout-button]");
    const roomSwitchButtons = Array.from(document.querySelectorAll("[data-room-switch]"));
    const roomNameLabel = document.querySelector("[data-community-room-name]");
    const user = meResponse.user || {};
    const dashboard = dashboardResponse.data || {};
    const room = new URLSearchParams(window.location.search).get("room") || "general";
    let replyTarget = null;

    const appendChatMessage = (message) => {
      if (!chatContainer) {
        return;
      }

      chatContainer.insertAdjacentHTML("beforeend", renderCommunityMessage(message));
      scrollCommunityChatToBottom(chatContainer);
    };

    const clearReplyTarget = () => {
      replyTarget = null;
      if (messageInput) {
        delete messageInput.dataset.replyId;
        delete messageInput.dataset.replyName;
        delete messageInput.dataset.replyContent;
      }
      if (replyPreview) {
        replyPreview.classList.add("hidden");
      }
      if (replyName) {
        replyName.textContent = "Student";
      }
      if (replySnippet) {
        replySnippet.textContent = "";
      }
    };

    const setReplyTarget = (messageId, senderName, content) => {
      replyTarget = {
        messageId,
        senderName: senderName || "Student",
        content: content || "",
      };

      if (messageInput) {
        messageInput.dataset.replyId = replyTarget.messageId || "";
        messageInput.dataset.replyName = replyTarget.senderName || "Student";
        messageInput.dataset.replyContent = replyTarget.content || "";
      }

      if (replyName) {
        replyName.textContent = replyTarget.senderName;
      }

      if (replySnippet) {
        replySnippet.textContent = replyTarget.content;
      }

      if (replyPreview) {
        replyPreview.classList.remove("hidden");
      }
      messageInput?.focus();
    };

    if (postsContainer) {
      postsContainer.innerHTML = (postsResponse.data?.posts || []).map(renderCommunityPost).join("");
    }

    if (chatContainer) {
      chatContainer.innerHTML = (chatResponse.data?.messages || []).map(renderCommunityMessage).join("");
      scrollCommunityChatToBottom(chatContainer);
    }

    chatContainer?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-community-reply-button]");
      if (!button) {
        return;
      }

      event.preventDefault();
      setReplyTarget(button.dataset.replyId, button.dataset.replyName, button.dataset.replyContent);
    });

    replyCancel?.addEventListener("click", clearReplyTarget);

    if (statusLabel) {
      statusLabel.textContent = `${chatResponse.data?.messages?.length || 0} recent messages`;
    }

    if (roomNameLabel) {
      roomNameLabel.textContent = formatRoomTitle(room);
    }

    roomSwitchButtons.forEach((button) => {
      const isActive = button.dataset.roomSwitch === room;
      button.classList.toggle("bg-indigo-500", isActive);
      button.classList.toggle("text-on-primary", isActive);
      button.classList.toggle("text-slate-400", !isActive);
      button.classList.toggle("font-semibold", isActive);

      button.addEventListener("click", () => {
        const nextRoom = button.dataset.roomSwitch || "general";
        window.location.href = `/Community.html?room=${encodeURIComponent(nextRoom)}`;
      });
    });

    const openProfileModal = () => {
      if (!profileModal) {
        return;
      }

      const avatarUrl = user.avatar || dashboard.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || dashboard.profile?.name || "Student")}`;
      const level = dashboard.level?.current || user.currentLevel || 1;
      const levelTitle = dashboard.level?.title || user.levelTitle || "Freshman";

      const profileBindings = {
        "[data-community-profile-name]": user.name || dashboard.profile?.name || "Student",
        "[data-community-profile-email]": user.collegeEmail || dashboard.profile?.collegeEmail || "",
        "[data-community-profile-level]": `Level ${level}`,
        "[data-community-profile-title]": levelTitle,
        "[data-community-profile-xp]": `${Number(dashboard.level?.currentXP ?? user.currentXP ?? 0).toLocaleString()} / ${Number(dashboard.level?.requiredXP ?? 100).toLocaleString()} XP`,
        "[data-community-profile-streak]": `${dashboard.streak?.current ?? user.dailyStreak ?? 0} day streak`,
        "[data-community-profile-rank]": dashboard.rank?.position ? `#${dashboard.rank.position}` : "#-",
        "[data-community-profile-major]": user.major || "Computer Science & HCI",
        "[data-community-profile-bio]": user.bio || "Student at LevelUp Campus.",
        "[data-community-profile-posts]": String(dashboard.communityStats?.posts ?? user.postsCount ?? 0),
        "[data-community-profile-comments]": String(dashboard.communityStats?.comments ?? user.commentsCount ?? 0),
        "[data-community-profile-upvotes]": String(dashboard.communityStats?.upvotesReceived ?? user.upvotesReceived ?? 0),
      };

      Object.entries(profileBindings).forEach(([selector, value]) => {
        document.querySelectorAll(selector).forEach((element) => {
          element.textContent = value;
        });
      });

      const profileAvatar = document.querySelector("[data-community-profile-avatar]");
      if (profileAvatar) {
        profileAvatar.src = avatarUrl;
      }

      profileModal.classList.remove("hidden");
      profileModal.classList.add("flex");
      profileModal.setAttribute("aria-hidden", "false");
    };

    const closeProfileModal = () => {
      if (!profileModal) {
        return;
      }

      profileModal.classList.add("hidden");
      profileModal.classList.remove("flex");
      profileModal.setAttribute("aria-hidden", "true");
    };

    profileTrigger?.addEventListener("click", openProfileModal);
    profileCloseButtons.forEach((button) => {
      button.addEventListener("click", closeProfileModal);
    });

    logoutButton?.addEventListener("click", () => {
      if (socket) {
        socket.disconnect();
      }
      logoutUser();
    });

    profileModal?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeProfileModal();
      }
    });

    if (typeof window.io !== "function") {
      if (statusLabel) {
        statusLabel.textContent = "Chat unavailable";
      }
      return;
    }

    const socket = window.io({
      auth: { token: getToken() },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("join_room", { room });
      if (statusLabel) {
        statusLabel.textContent = `${chatResponse.data?.messages?.length || 0} recent messages`;
      }
    });

    socket.on("online_count", (count) => {
      if (statusLabel) {
        const messageCount = chatResponse.data?.messages?.length || 0;
        statusLabel.textContent = `${messageCount} recent messages • ${count} online`;
      }
    });

    socket.on("chat_history", ({ room: joinedRoom, messages }) => {
      if (joinedRoom === room && chatContainer) {
        chatContainer.innerHTML = (messages || []).map(renderCommunityMessage).join("");
        scrollCommunityChatToBottom(chatContainer);
      }
    });

    socket.on("new_message", (message) => {
      if (message.room === room) {
        appendChatMessage(message);
      }
    });

    socket.on("system_message", (message) => {
      appendChatMessage({
        sender: { name: "System", avatar: null },
        content: message.content,
        createdAt: message.timestamp,
      });
    });

    const sendMessage = () => {
      const content = messageInput?.value.trim();
      if (!content) {
        return;
      }

      const replyContext = messageInput?.dataset.replyId
        ? {
            messageId: messageInput.dataset.replyId,
            senderName: messageInput.dataset.replyName || "Student",
            content: messageInput.dataset.replyContent || "",
          }
        : replyTarget;

      socket.emit("send_message", { content, room, replyTo: replyContext ? { ...replyContext } : null });
      if (messageInput) {
        messageInput.value = "";
        messageInput.focus();
      }
      clearReplyTarget();
    };

    sendButton?.addEventListener("click", sendMessage);
    messageInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });

    window.addEventListener("beforeunload", () => {
      socket.disconnect();
    });

    socket.on("connect_error", (error) => {
      if (statusLabel) {
        statusLabel.textContent = `Chat unavailable: ${error.message}`;
      }
    });
  } catch (error) {
    const fallbackMessage = document.createElement("p");
    fallbackMessage.className = "mx-auto mt-6 max-w-xl rounded-2xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-100 backdrop-blur-md";
    fallbackMessage.textContent = `Community failed to load: ${error.message}`;
    document.body.appendChild(fallbackMessage);
  }
}

function renderRewardBadge(badge) {
  const unlocked = badge.isEarned;
  const progress = badge.progress ?? 0;
  const icon = badge.icon || "military_tech";

  return `
    <div class="glass-card rounded-2xl p-md flex flex-col items-center text-center group active:scale-95 transition-all ${unlocked ? "" : "opacity-70 grayscale-[0.4]"}">
      <div class="relative w-24 h-24 mb-md">
        <div class="absolute inset-0 ${unlocked ? "bg-indigo-500/20" : "bg-white/5"} rounded-full blur-xl transition-all"></div>
        <div class="relative w-24 h-24 rounded-full border-2 ${unlocked ? "border-indigo-500/50" : "border-white/10"} flex items-center justify-center badge-gradient bg-surface-container-high shadow-lg">
          <span class="material-symbols-outlined ${unlocked ? "text-indigo-400" : "text-slate-600"} text-4xl">${icon}</span>
        </div>
      </div>
      <h3 class="text-body-md font-bold text-white mb-xs">${badge.name}</h3>
      <p class="text-label-caps text-slate-400 mb-md">${badge.description}</p>
      <div class="w-full bg-white/5 h-1 rounded-full mb-1">
        <div class="bg-tertiary h-full" style="width:${progress}%"></div>
      </div>
      <span class="${unlocked ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-surface-container-highest text-slate-500 border-white/5"} px-3 py-1 rounded-full text-[10px] font-bold border uppercase">${unlocked ? "Earned" : `${progress}% progress`}</span>
    </div>
  `;
}

function renderRecentRewardBadge(entry) {
  const badge = entry.badge || entry;
  const icon = badge.icon || "military_tech";
  const when = entry.earnedAt ? new Date(entry.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Recently";

  return `
    <div class="glass-card rounded-2xl p-md flex items-center gap-md">
      <div class="w-14 h-14 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0 border border-indigo-500/30">
        <span class="material-symbols-outlined text-indigo-400 text-3xl">${icon}</span>
      </div>
      <div class="min-w-0">
        <p class="text-white font-bold truncate">${badge.name || "Badge"}</p>
        <p class="text-slate-400 text-sm line-clamp-2">${badge.description || "Unlocked badge"}</p>
        <p class="text-[10px] uppercase tracking-widest text-indigo-400 mt-1">Unlocked ${when}</p>
      </div>
    </div>
  `;
}

function renderRewardTimelineItem(entry) {
  const source = entry.achievement || entry.badge || entry;
  const title = source?.name || "Achievement unlocked";
  const description = source?.description || "";
  const when = entry.earnedAt ? new Date(entry.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Recently";

  return `
    <div class="relative pl-10">
      <div class="absolute left-0 top-1 w-6 h-6 rounded-full bg-indigo-500 border-4 border-slate-900 z-10"></div>
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h4 class="text-body-md font-bold text-white">${title}</h4>
          <p class="text-body-md text-slate-400">${description}</p>
        </div>
        <span class="text-label-caps text-indigo-400 whitespace-nowrap">${when}</span>
      </div>
    </div>
  `;
}

function renderLevelHistoryEntry(entry, isCurrent = false) {
  const when = entry.date ? new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Recently";
  return `
    <div class="flex items-center gap-4 rounded-2xl border ${isCurrent ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-white/5"} p-md">
      <div class="w-12 h-12 rounded-full flex items-center justify-center ${isCurrent ? "bg-cyan-400/20 text-cyan-300" : "bg-indigo-500/15 text-indigo-300"}">
        <span class="material-symbols-outlined">military_tech</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-white font-bold">Level ${entry.level}${isCurrent ? " (Current)" : ""}</h4>
          <span class="text-[10px] uppercase tracking-widest ${isCurrent ? "text-cyan-300" : "text-slate-400"}">${when}</span>
        </div>
        <p class="text-slate-400 text-sm">${entry.title || `Level ${entry.level}`}</p>
      </div>
    </div>
  `;
}

async function initRewardsPage() {
  if (!getToken()) {
    window.location.href = "/Login.html";
    return;
  }

  try {
    const [summaryResponse, badgesResponse, achievementsResponse, levelsResponse] = await Promise.all([
      apiFetch("/api/rewards"),
      apiFetch("/api/rewards/badges"),
      apiFetch("/api/rewards/achievements"),
      apiFetch("/api/levels"),
    ]);

    const summary = summaryResponse.data || {};
    const badgesContainer = document.querySelector("[data-rewards-badges]");
    const recentBadgesContainer = document.querySelector("[data-rewards-recent-badges]");
    const timelineContainer = document.querySelector("[data-rewards-timeline]");
    const levelHistoryContainer = document.querySelector("[data-level-history]");

    const bindings = {
      "rewards-earned-badges": summary.earned?.badges ?? 0,
      "rewards-earned-achievements": summary.earned?.achievements ?? 0,
      "rewards-total-badges": summary.total?.badges ?? 0,
      "rewards-total-achievements": summary.total?.achievements ?? 0,
      "rewards-completion": `${summary.completionPercent ?? 0}%`,
    };

    Object.entries(bindings).forEach(([key, value]) => {
      document.querySelectorAll(`[data-bind="${key}"]`).forEach((element) => {
        element.textContent = value;
      });
    });

    if (badgesContainer) {
      badgesContainer.innerHTML = (badgesResponse.data?.badges || []).map(renderRewardBadge).join("");
    }

    if (recentBadgesContainer) {
      const recentBadges = summary.recentBadges || [];
      recentBadgesContainer.innerHTML = recentBadges.length
        ? recentBadges.map(renderRecentRewardBadge).join("")
        : `<div class="rounded-2xl border border-white/10 bg-white/5 p-md text-slate-400 text-sm">No badges unlocked yet.</div>`;
    }

    if (levelHistoryContainer) {
      const history = levelsResponse.data?.levelHistory || [];
      const current = levelsResponse.data?.current;
      const currentMarkup = current ? renderLevelHistoryEntry({ level: current.level, title: current.title, date: current.date }, true) : "";
      const previousMarkup = history
        .filter((entry) => Number(entry.level) < Number(current?.level || 1))
        .slice()
        .reverse()
        .map((entry) => renderLevelHistoryEntry(entry, false))
        .join("");

      levelHistoryContainer.innerHTML = `${currentMarkup}${previousMarkup || `<div class="rounded-2xl border border-white/10 bg-white/5 p-md text-slate-400 text-sm">No previous levels yet.</div>`}`;
    }

    if (timelineContainer) {
      timelineContainer.innerHTML = (achievementsResponse.data?.achievements || []).slice(0, 3).map(renderRewardTimelineItem).join("");
    }
  } catch (error) {
    const fallbackMessage = document.createElement("p");
    fallbackMessage.className = "mx-auto mt-6 max-w-xl rounded-2xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-100 backdrop-blur-md";
    fallbackMessage.textContent = `Rewards failed to load: ${error.message}`;
    document.body.appendChild(fallbackMessage);
  }
}

async function initProfilePage() {
  if (!getToken()) {
    window.location.href = "/Login.html";
    return;
  }

  try {
    const [meResponse, dashboardResponse] = await Promise.all([
      apiFetch("/api/auth/me"),
      apiFetch("/api/dashboard"),
    ]);

    const user = meResponse.user || {};
    const data = dashboardResponse.data || {};
    const avatarUrl = user.avatar || data.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || data.profile?.name || "Student")}`;
    const displayNameInput = document.querySelector("[data-profile-input=display-name]");
    const majorInput = document.querySelector("[data-profile-input=major]");
    const bioInput = document.querySelector("[data-profile-input=bio]");
    const saveButton = document.querySelector("[data-profile-save-button]");
    const discardButton = document.querySelector("[data-profile-discard-button]");
    const editToggleButton = document.querySelector("[data-profile-edit-toggle]");
    const toggleButtons = Array.from(document.querySelectorAll("[data-profile-toggle]"));
    const state = {
      name: user.name || data.profile?.name || "Student",
      major: user.major || "Computer Science & HCI",
      bio: user.bio || "Senior student focused on gamifying education.",
      publicProfile: user.publicProfile ?? true,
      showRank: user.showRank ?? true,
      incognitoMode: user.incognitoMode ?? false,
    };

    const setToggleVisualState = (button, enabled) => {
      if (!button) {
        return;
      }

      const knob = button.querySelector("div");

      if (enabled) {
        button.classList.remove("bg-surface-container-highest");
        button.classList.add("bg-indigo-500");
        if (knob) {
          knob.className = "absolute right-1 top-1 w-4 h-4 bg-white rounded-full";
        }
        return;
      }

      button.classList.remove("bg-indigo-500");
      button.classList.add("bg-surface-container-highest");
      if (knob) {
        knob.className = "absolute left-1 top-1 w-4 h-4 bg-white/40 rounded-full";
      }
    };

    const setEditMode = (enabled) => {
      [displayNameInput, majorInput, bioInput].forEach((input) => {
        if (!input) {
          return;
        }

        input.readOnly = !enabled;
        input.classList.toggle("ring-1", enabled);
        input.classList.toggle("ring-primary", enabled);
        input.classList.toggle("border-primary", enabled);
      });

      toggleButtons.forEach((button) => {
        button.disabled = !enabled;
        button.classList.toggle("opacity-70", !enabled);
        button.classList.toggle("cursor-not-allowed", !enabled);
      });

      if (saveButton) {
        saveButton.disabled = !enabled;
        saveButton.classList.toggle("opacity-70", !enabled);
        saveButton.classList.toggle("cursor-not-allowed", !enabled);
      }

      if (discardButton) {
        discardButton.disabled = !enabled;
        discardButton.classList.toggle("opacity-70", !enabled);
        discardButton.classList.toggle("cursor-not-allowed", !enabled);
      }
    };

    const syncInputs = () => {
      if (displayNameInput) displayNameInput.value = state.name;
      if (majorInput) majorInput.value = state.major;
      if (bioInput) bioInput.value = state.bio;
      toggleButtons.forEach((button) => {
        const key = button.dataset.profileToggle;
        setToggleVisualState(button, Boolean(state[key]));
      });
    };

    const updateProfileText = (nextUser) => {
      const nextLevel = data.level?.current || nextUser.currentLevel || 1;
      const nextTitle = data.level?.title || nextUser.levelTitle || "Freshman";

      document.querySelectorAll("[data-profile-page-name]").forEach((element) => {
        element.textContent = nextUser.name || "Student";
      });

      document.querySelectorAll("[data-profile-page-level]").forEach((element) => {
        element.textContent = `Level ${nextLevel} • ${nextTitle}`;
      });

      document.querySelectorAll("[data-profile-page-streak]").forEach((element) => {
        element.textContent = String(data.streak?.current ?? nextUser.dailyStreak ?? 0);
      });

      const emailElement = document.querySelector("[data-profile-page-email]");
      if (emailElement) {
        emailElement.textContent = nextUser.collegeEmail || data.profile?.collegeEmail || "";
      }

      if (displayNameInput) {
        displayNameInput.value = nextUser.name || "";
      }

      if (majorInput) {
        majorInput.value = nextUser.major || state.major;
      }

      if (bioInput) {
        bioInput.value = nextUser.bio || state.bio;
      }

      state.name = nextUser.name || state.name;
      state.major = nextUser.major || state.major;
      state.bio = nextUser.bio || state.bio;
      state.publicProfile = nextUser.publicProfile ?? state.publicProfile;
      state.showRank = nextUser.showRank ?? state.showRank;
      state.incognitoMode = nextUser.incognitoMode ?? state.incognitoMode;

      const profileAvatar = document.querySelector("[data-profile-page-avatar]");
      if (profileAvatar && nextUser.avatar) {
        profileAvatar.src = nextUser.avatar;
      }
    };

    syncInputs();
    setEditMode(true);

    const profileBindings = {
      "[data-profile-page-name]": user.name || data.profile?.name || "Student",
      "[data-profile-page-email]": user.collegeEmail || data.profile?.collegeEmail || "",
      "[data-profile-page-level]": `Level ${data.level?.current || user.currentLevel || 1} • ${data.level?.title || user.levelTitle || "Freshman"}`,
      "[data-profile-page-streak]": data.streak?.current ?? user.dailyStreak ?? 0,
    };

    Object.entries(profileBindings).forEach(([selector, value]) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.textContent = value;
      });
    });

    const profileAvatar = document.querySelector("[data-profile-page-avatar]");
    if (profileAvatar) {
      profileAvatar.src = avatarUrl;
    }

    const profileXp = document.querySelector("[data-profile-page-xp]");
    if (profileXp) {
      profileXp.textContent = Number(data.level?.totalXP ?? user.totalXP ?? 0).toLocaleString();
    }

    [displayNameInput, majorInput, bioInput].forEach((input) => {
      if (input) {
        input.addEventListener("input", () => {
          input.dataset.dirty = "true";
        });
      }
    });

    toggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled) {
          return;
        }

        const key = button.dataset.profileToggle;
        state[key] = !state[key];
        setToggleVisualState(button, state[key]);
      });
    });

    if (editToggleButton) {
      editToggleButton.addEventListener("click", () => {
        setEditMode(true);
        displayNameInput?.focus();
      });
    }

    if (discardButton) {
      discardButton.addEventListener("click", () => {
        state.name = user.name || data.profile?.name || "Student";
        state.major = user.major || "Computer Science & HCI";
        state.bio = user.bio || "Senior student focused on gamifying education.";
        state.publicProfile = user.publicProfile ?? true;
        state.showRank = user.showRank ?? true;
        state.incognitoMode = user.incognitoMode ?? false;
        syncInputs();
      });
    }

    if (saveButton) {
      saveButton.addEventListener("click", async () => {
        try {
          saveButton.disabled = true;
          saveButton.textContent = "Saving...";

          const response = await apiFetch("/api/auth/me", {
            method: "PATCH",
            body: JSON.stringify({
              name: displayNameInput?.value.trim() || state.name,
              major: majorInput?.value.trim() || state.major,
              bio: bioInput?.value.trim() || state.bio,
              publicProfile: state.publicProfile,
              showRank: state.showRank,
              incognitoMode: state.incognitoMode,
            }),
          });

          const nextUser = response.user || {};
          setUser({ ...user, ...nextUser });
          updateProfileText(nextUser);
          setEditMode(false);
          saveButton.textContent = "Save Changes";
        } catch (error) {
          saveButton.textContent = "Save Changes";
          saveButton.disabled = false;
          const fallbackMessage = document.createElement("p");
          fallbackMessage.className = "mx-auto mt-6 max-w-xl rounded-2xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-100 backdrop-blur-md";
          fallbackMessage.textContent = `Profile update failed: ${error.message}`;
          document.body.appendChild(fallbackMessage);
        }
      });
    }
  } catch (error) {
    const fallbackMessage = document.createElement("p");
    fallbackMessage.className = "mx-auto mt-6 max-w-xl rounded-2xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-100 backdrop-blur-md";
    fallbackMessage.textContent = `Profile failed to load: ${error.message}`;
    document.body.appendChild(fallbackMessage);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  wireNavigationLinks();

  if (document.body.dataset.page === "login") {
    initLoginPage();
  }

  if (document.body.dataset.page === "dashboard") {
    initDashboardPage();
  }

  if (document.body.dataset.page === "leaderboard") {
    initLeaderboardPage();
  }

  if (document.body.dataset.page === "community") {
    initCommunityPage();
  }

  if (document.body.dataset.page === "rewards") {
    initRewardsPage();
  }

  if (document.body.dataset.page === "profile") {
    initProfilePage();
  }
  if (document.body.dataset.page === "calendar") {
    initCalendarPage();
  }
});