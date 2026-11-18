(() => {
  "use strict";

  /* =========================================================
     常量与状态
     ========================================================= */

  const PREFS_KEY = "shizhi.preferences.v1";
  const LEGACY_STORAGE_KEY = "shizhi.knowledge.v1";
  const LEGACY_MIGRATION_KEY = "shizhi.migratedToMysql.v1";
  const UNCATEGORIZED = "__uncategorized__";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const MAX_TAGS = 20;
  const MAX_TAG_LENGTH = 30;
  const VISIBLE_TAG_LIMIT = 12;

  const KNOWN_CATEGORY_COLORS = {
    编程: "#2f7d68",
    代码: "#2f7d68",
    开发: "#2f7d68",
    学习: "#4f6fa8",
    阅读: "#a77b37",
    写作: "#b36a50",
    工作: "#5f7280",
    设计: "#8b5e79",
    生活: "#b9863d",
    效率: "#6e7b4f",
    产品: "#7a6aa3",
    音乐: "#9b5d5d",
    语言: "#4d7f91",
  };

  const CATEGORY_PALETTE = [
    "#2f7d68",
    "#4f6fa8",
    "#b36a50",
    "#a77b37",
    "#8b5e79",
    "#5f7280",
    "#6e7b4f",
    "#7a6aa3",
    "#4d7f91",
  ];

  const TABLE_TEMPLATES = {
    meeting: {
      title: "会议时间线",
      columns: ["会议", "时间", "核心考点", "标志性文件 / 成果", "关键词"],
    },
    concept: {
      title: "概念对照",
      columns: ["概念", "一句话定义", "关键区别", "例子"],
    },
    blank: {
      title: "未命名表格",
      columns: ["主题", "内容", "备注"],
    },
  };

  const state = {
    items: [],
    filter: "all",
    category: null,
    tag: null,
    query: "",
    sort: "updated",
    view: "grid",
    showAllTags: false,
    loading: true,
    loadError: false,
    saving: false,
    legacyMigrationChecked: false,
    user: null,
    authMode: "login",
    authBusy: false,
    booted: false,
    memoryHideAnswers: true,
    memoryOnlyUnmastered: false,
    memorySeed: 0,
  };

  const ui = {
    editingId: null,
    initialSnapshot: "",
    pendingDeleteId: null,
    searchTimer: null,
    lastEmail: "",
    tables: [],
    activeTableId: null,
    tableDraft: null,
    tableDirty: false,
    tableSaving: false,
    tableSaveTimer: null,
  };

  const dom = {
    searchInput: document.getElementById("searchInput"),
    searchClear: document.getElementById("searchClear"),
    searchKbd: document.querySelector(".search-kbd"),
    searchBox: document.querySelector(".searchbox"),
    brandLink: document.getElementById("brandLink"),
    newBtn: document.getElementById("newBtn"),
    importBtn: document.getElementById("importBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importInput: document.getElementById("importInput"),
    dbStatusText: document.getElementById("dbStatusText"),
    dbStatusDot: document.getElementById("dbStatusDot"),
    countAll: document.getElementById("countAll"),
    countFavorites: document.getElementById("countFavorites"),
    navAll: document.querySelector('[data-nav="all"]'),
    navFavorites: document.querySelector('[data-nav="favorites"]'),
    categoryList: document.getElementById("categoryList"),
    tagCloud: document.getElementById("tagCloud"),
    pageEyebrow: document.getElementById("pageEyebrow"),
    pageTitle: document.getElementById("pageTitle"),
    pageSubtitle: document.getElementById("pageSubtitle"),
    sortSelect: document.getElementById("sortSelect"),
    gridViewBtn: document.getElementById("gridViewBtn"),
    listViewBtn: document.getElementById("listViewBtn"),
    memoryViewBtn: document.getElementById("memoryViewBtn"),
    filterBar: document.getElementById("filterBar"),
    resultNote: document.getElementById("resultNote"),
    cardGrid: document.getElementById("cardGrid"),
    memoryView: document.getElementById("memoryView"),
    memoryTableWrap: document.getElementById("memoryTableWrap"),
    memoryTableBody: document.getElementById("memoryTableBody"),
    memoryCount: document.getElementById("memoryCount"),
    memoryEmpty: document.getElementById("memoryEmpty"),
    hideAnswersToggle: document.getElementById("hideAnswersToggle"),
    onlyUnmasteredToggle: document.getElementById("onlyUnmasteredToggle"),
    shuffleMemoryBtn: document.getElementById("shuffleMemoryBtn"),
    emptyState: document.getElementById("emptyState"),
    emptyAddBtn: document.getElementById("emptyAddBtn"),
    sampleBtn: document.getElementById("sampleBtn"),
    noResults: document.getElementById("noResults"),
    clearFiltersBtn: document.getElementById("clearFiltersBtn"),
    serverError: document.getElementById("serverError"),
    serverErrorDetail: document.getElementById("serverErrorDetail"),
    retryLoadBtn: document.getElementById("retryLoadBtn"),
    editorDialog: document.getElementById("editorDialog"),
    knowledgeForm: document.getElementById("knowledgeForm"),
    editorEyebrow: document.getElementById("editorEyebrow"),
    editorTitle: document.getElementById("editorTitle"),
    editorClose: document.getElementById("editorClose"),
    editorCancel: document.getElementById("editorCancel"),
    saveBtnText: document.getElementById("saveBtnText"),
    titleInput: document.getElementById("titleInput"),
    titleError: document.getElementById("titleError"),
    categoryInput: document.getElementById("categoryInput"),
    categoryOptions: document.getElementById("categoryOptions"),
    tagInput: document.getElementById("tagInput"),
    contentInput: document.getElementById("contentInput"),
    contentCount: document.getElementById("contentCount"),
    mnemonicInput: document.getElementById("mnemonicInput"),
    mnemonicCount: document.getElementById("mnemonicCount"),
    sourceInput: document.getElementById("sourceInput"),
    favoriteInput: document.getElementById("favoriteInput"),
    deleteDialog: document.getElementById("deleteDialog"),
    deleteItemTitle: document.getElementById("deleteItemTitle"),
    deleteCancel: document.getElementById("deleteCancel"),
    deleteConfirm: document.getElementById("deleteConfirm"),
    toastRegion: document.getElementById("toastRegion"),
    mainContent: document.getElementById("mainContent"),
    pageRoot: document.getElementById("pageRoot"),
    bootScreen: document.getElementById("bootScreen"),
    authScreen: document.getElementById("authScreen"),
    authEyebrow: document.getElementById("authEyebrow"),
    authTitle: document.getElementById("authTitle"),
    authSubtitle: document.getElementById("authSubtitle"),
    authError: document.getElementById("authError"),
    loginTab: document.getElementById("loginTab"),
    registerTab: document.getElementById("registerTab"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    loginEmail: document.getElementById("loginEmail"),
    loginPassword: document.getElementById("loginPassword"),
    registerName: document.getElementById("registerName"),
    registerEmail: document.getElementById("registerEmail"),
    registerPassword: document.getElementById("registerPassword"),
    registerConfirm: document.getElementById("registerConfirm"),
    loginBtn: document.getElementById("loginBtn"),
    registerBtn: document.getElementById("registerBtn"),
    accountMenu: document.getElementById("accountMenu"),
    accountButton: document.getElementById("accountButton"),
    accountAvatar: document.getElementById("accountAvatar"),
    accountName: document.getElementById("accountName"),
    accountPopover: document.getElementById("accountPopover"),
    accountPopoverName: document.getElementById("accountPopoverName"),
    accountEmail: document.getElementById("accountEmail"),
    logoutBtn: document.getElementById("logoutBtn"),
    tablesNavBtn: document.getElementById("tablesNavBtn"),
    tablesDialog: document.getElementById("tablesDialog"),
    tablesHeading: document.getElementById("tablesHeading"),
    tablesBackBtn: document.getElementById("tablesBackBtn"),
    tablesCloseBtn: document.getElementById("tablesCloseBtn"),
    tablesNewBtn: document.getElementById("tablesNewBtn"),
    tablesListView: document.getElementById("tablesListView"),
    tablesEditorView: document.getElementById("tablesEditorView"),
    tablesEmpty: document.getElementById("tablesEmpty"),
    tablesListGrid: document.getElementById("tablesListGrid"),
    emptyNewTableBtn: document.getElementById("emptyNewTableBtn"),
    tableCreatePanel: document.getElementById("tableCreatePanel"),
    newTableTitle: document.getElementById("newTableTitle"),
    newTableTemplate: document.getElementById("newTableTemplate"),
    createTableConfirm: document.getElementById("createTableConfirm"),
    createTableCancel: document.getElementById("createTableCancel"),
    tableTitleInput: document.getElementById("tableTitleInput"),
    tableDescInput: document.getElementById("tableDescInput"),
    tableSaveStatus: document.getElementById("tableSaveStatus"),
    addRowBtn: document.getElementById("addRowBtn"),
    addColumnBtn: document.getElementById("addColumnBtn"),
    deleteTableBtn: document.getElementById("deleteTableBtn"),
    tableHeaderRow: document.getElementById("tableHeaderRow"),
    tableBody: document.getElementById("tableBody"),
  };

  /* =========================================================
     启动
     ========================================================= */

  init();

  function init() {
    loadPreferences();
    syncPreferenceControls();
    bindEvents();
    bindAuthEvents();
    render();
    bootstrapAuth();
  }

  async function bootstrapAuth() {
    try {
      const user = await window.KnowledgeAPI.me();
      await onAuthenticated(user);
    } catch (error) {
      hideBootScreen();
      showAuth("login");
      if (error && error.status !== 401) {
        setAuthError(error.message || "无法连接数据服务，请稍后重试。");
      }
    }
  }

  async function onAuthenticated(user) {
    state.user = user;
    state.booted = true;
    updateAccountUI(user);
    hideBootScreen();
    hideAuth();
    await refreshKnowledge();
  }

  function hideBootScreen() {
    if (dom.bootScreen) {
      dom.bootScreen.hidden = true;
    }
  }

  function showAuth(mode = "login", message = "") {
    state.user = null;
    state.items = [];
    state.filter = "all";
    state.category = null;
    state.tag = null;
    state.query = "";
    state.loading = false;
    state.loadError = false;
    if (dom.searchInput) {
      dom.searchInput.value = "";
    }

    closeAccountMenu();
    if (dom.editorDialog.open) {
      dom.editorDialog.close();
    }
    if (dom.deleteDialog.open) {
      dom.deleteDialog.close();
    }
    if (dom.tablesDialog.open) {
      dom.tablesDialog.close();
    }

    hideBootScreen();
    dom.authScreen.hidden = false;
    document.body.classList.add("auth-open");
    dom.pageRoot.inert = true;
    switchAuthMode(mode);
    if (message) {
      setAuthError(message);
    }
    render();
    window.setTimeout(() => {
      if (state.authMode === "register") {
        dom.registerName.focus();
      } else {
        dom.loginEmail.focus();
      }
    }, 80);
  }

  function hideAuth() {
    if (!dom.authScreen) {
      return;
    }
    dom.authScreen.hidden = true;
    document.body.classList.remove("auth-open");
    dom.pageRoot.inert = false;
  }

  function switchAuthMode(mode) {
    state.authMode = mode === "register" ? "register" : "login";
    const isRegister = state.authMode === "register";

    dom.loginForm.hidden = isRegister;
    dom.registerForm.hidden = !isRegister;
    dom.loginTab.classList.toggle("is-active", !isRegister);
    dom.registerTab.classList.toggle("is-active", isRegister);
    dom.loginTab.setAttribute("aria-selected", String(!isRegister));
    dom.registerTab.setAttribute("aria-selected", String(isRegister));

    dom.authEyebrow.textContent = isRegister ? "A NEW ISLAND" : "WELCOME BACK";
    dom.authTitle.textContent = isRegister ? "创建账号" : "登录拾知";
    dom.authSubtitle.textContent = isRegister
      ? "建立只属于你的知识库。"
      : "继续整理你的知识岛屿。";
    clearAuthError();
    if (ui.lastEmail && !dom.loginEmail.value) {
      dom.loginEmail.value = ui.lastEmail;
      dom.registerEmail.value = ui.lastEmail;
    }
    window.setTimeout(() => {
      (isRegister ? dom.registerName : dom.loginEmail).focus();
    }, 30);
  }

  function setAuthError(message) {
    dom.authError.textContent = message;
    dom.authError.hidden = !message;
  }

  function clearAuthError() {
    dom.authError.textContent = "";
    dom.authError.hidden = true;
  }

  function updateAccountUI(user) {
    const name = (user && user.displayName) || "我的账号";
    const email = (user && user.email) || "";
    const initial = Array.from(name.trim())[0] || "拾";

    dom.accountName.textContent = name;
    dom.accountAvatar.textContent = initial.toUpperCase();
    dom.accountPopoverName.textContent = name;
    dom.accountEmail.textContent = email;
    dom.accountButton.title = email ? `已登录：${email}` : "账户菜单";
    dom.accountButton.setAttribute("aria-label", `账户菜单：${name}`);
  }

  function toggleAccountMenu(force) {
    const open =
      typeof force === "boolean" ? force : dom.accountPopover.hidden;
    dom.accountPopover.hidden = !open;
    dom.accountButton.setAttribute("aria-expanded", String(open));
  }

  function closeAccountMenu() {
    if (!dom.accountPopover || dom.accountPopover.hidden) {
      return;
    }
    dom.accountPopover.hidden = true;
    dom.accountButton.setAttribute("aria-expanded", "false");
  }

  function setAuthBusy(busy) {
    state.authBusy = busy;
    dom.loginBtn.disabled = busy;
    dom.registerBtn.disabled = busy;
    dom.loginTab.disabled = busy;
    dom.registerTab.disabled = busy;
    dom.loginBtn.querySelector("span").textContent = busy ? "登录中…" : "登录";
    dom.registerBtn.querySelector("span").textContent = busy
      ? "创建中…"
      : "创建我的知识库";
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (state.authBusy) {
      return;
    }
    clearAuthError();

    const email = dom.loginEmail.value.trim();
    const password = dom.loginPassword.value;
    if (!email || !password) {
      setAuthError("请输入邮箱和密码。");
      return;
    }

    setAuthBusy(true);
    try {
      const user = await window.KnowledgeAPI.login({ email, password });
      ui.lastEmail = user.email;
      dom.loginForm.reset();
      dom.registerForm.reset();
      await onAuthenticated(user);
      if (state.user) {
        showToast(`欢迎回来，${user.displayName || user.email}。`);
      }
    } catch (error) {
      setAuthError(error.message || "登录失败，请稍后重试。");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    if (state.authBusy) {
      return;
    }
    clearAuthError();

    const displayName = dom.registerName.value.trim();
    const email = dom.registerEmail.value.trim();
    const password = dom.registerPassword.value;
    const confirmPassword = dom.registerConfirm.value;

    if (!email || !password) {
      setAuthError("请填写邮箱和密码。");
      return;
    }
    if (password.length < 8) {
      setAuthError("密码至少需要 8 位。");
      dom.registerPassword.focus();
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("两次输入的密码不一致。");
      dom.registerConfirm.focus();
      return;
    }

    setAuthBusy(true);
    try {
      const user = await window.KnowledgeAPI.register({
        email,
        password,
        displayName,
      });
      ui.lastEmail = user.email;
      dom.loginForm.reset();
      dom.registerForm.reset();
      await onAuthenticated(user);
      if (state.user) {
        showToast(`知识岛已建好，欢迎你，${user.displayName || user.email}。`, {
          duration: 4500,
        });
      }
    } catch (error) {
      setAuthError(error.message || "创建账号失败，请稍后重试。");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    closeAccountMenu();
    const previousEmail = state.user ? state.user.email : "";
    dom.logoutBtn.disabled = true;
    try {
      await window.KnowledgeAPI.logout();
    } catch (error) {
      if (!error || error.status !== 401) {
        dom.logoutBtn.disabled = false;
        showToast("退出登录失败，请稍后重试。", { type: "error" });
        return;
      }
    }

    ui.lastEmail = previousEmail;
    dom.logoutBtn.disabled = false;
    showAuth("login");
    showToast("已退出登录。");
  }

  function handleSessionExpired() {
    if (!dom.authScreen.hidden) {
      return;
    }
    if (state.user && state.user.email) {
      ui.lastEmail = state.user.email;
    }
    showAuth("login", "登录已过期，请重新登录。");
    showToast("登录已过期，请重新登录。", { type: "error" });
  }

  function bindAuthEvents() {
    dom.loginTab.addEventListener("click", () => switchAuthMode("login"));
    dom.registerTab.addEventListener("click", () => switchAuthMode("register"));
    dom.loginForm.addEventListener("submit", handleLogin);
    dom.registerForm.addEventListener("submit", handleRegister);

    dom.accountButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleAccountMenu();
    });
    dom.logoutBtn.addEventListener("click", handleLogout);

    document.addEventListener("click", (event) => {
      if (!dom.accountMenu.contains(event.target)) {
        closeAccountMenu();
      }
    });

    [
      dom.loginEmail,
      dom.loginPassword,
      dom.registerName,
      dom.registerEmail,
      dom.registerPassword,
      dom.registerConfirm,
    ].forEach((input) => {
      input.addEventListener("input", () => {
        clearAuthError();
        input.removeAttribute("aria-invalid");
      });
    });

    window.addEventListener("shizhi:unauthorized", handleSessionExpired);
  }

  /* =========================================================
     知识表格
     ========================================================= */

  async function openTablesDialog() {
    if (!state.user || dom.tablesDialog.open) {
      return;
    }
    showTablesList();
    dom.tablesDialog.showModal();
    await loadTables();
  }

  function showTablesList() {
    ui.activeTableId = null;
    ui.tableDraft = null;
    ui.tableDirty = false;
    if (ui.tableSaveTimer) {
      window.clearTimeout(ui.tableSaveTimer);
      ui.tableSaveTimer = null;
    }
    dom.tablesListView.hidden = false;
    dom.tablesEditorView.hidden = true;
    dom.tablesBackBtn.hidden = true;
    dom.tablesNewBtn.hidden = false;
    dom.tablesHeading.textContent = "知识表格";
    dom.tableCreatePanel.hidden = true;
    renderTablesList();
  }

  async function loadTables() {
    try {
      ui.tables = await window.KnowledgeAPI.listTables();
      renderTablesList();
    } catch (error) {
      ui.tables = [];
      renderTablesList();
      showApiError(error, "读取表格失败，请稍后重试。");
    }
  }

  function renderTablesList() {
    const fragment = document.createDocumentFragment();
    for (const table of ui.tables) {
      const card = el("button", "table-list-card");
      card.type = "button";
      card.dataset.tableId = table.id;
      card.appendChild(el("span", "table-list-title", table.title));
      card.appendChild(
        el(
          "span",
          "table-list-desc",
          table.description || "没有说明",
        ),
      );

      const columns = el("span", "table-list-columns");
      for (const column of (table.columns || []).slice(0, 4)) {
        columns.appendChild(el("span", "table-list-column", column));
      }
      if ((table.columns || []).length > 4) {
        columns.appendChild(
          el("span", "table-list-column", `+${table.columns.length - 4}`),
        );
      }
      card.appendChild(columns);

      const meta = el("span", "table-list-meta");
      meta.appendChild(
        el(
          "span",
          null,
          `${table.rowCount || 0} 行 · ${table.columnCount || 0} 列`,
        ),
      );
      meta.appendChild(
        el("span", null, `更新于 ${relativeTime(table.updatedAt)}`),
      );
      card.appendChild(meta);
      fragment.appendChild(card);
    }

    dom.tablesListGrid.replaceChildren(fragment);
    dom.tablesEmpty.hidden = ui.tables.length > 0;
  }

  function showNewTableForm() {
    dom.tableCreatePanel.hidden = false;
    dom.newTableTitle.value = "";
    dom.newTableTemplate.value = "meeting";
    window.setTimeout(() => dom.newTableTitle.focus(), 30);
  }

  async function createTableFromForm() {
    const templateKey = dom.newTableTemplate.value;
    const template = TABLE_TEMPLATES[templateKey] || TABLE_TEMPLATES.meeting;
    const title = dom.newTableTitle.value.trim() || template.title;
    const columns = [...template.columns];
    const rows = [columns.map(() => "")];

    dom.createTableConfirm.disabled = true;
    try {
      const created = await window.KnowledgeAPI.createTable({
        title,
        description: "",
        columns,
        rows,
      });
      ui.tables = [created, ...ui.tables];
      dom.tableCreatePanel.hidden = true;
      await openTableEditor(created);
      showToast("表格已创建，可以直接编辑单元格。", { duration: 3000 });
    } catch (error) {
      showApiError(error, "创建表格失败，请稍后重试。");
    } finally {
      dom.createTableConfirm.disabled = false;
    }
  }

  async function openTableEditor(tableOrId) {
    if (ui.tableDirty && ui.tableDraft) {
      await flushTableSave();
    }

    const table =
      typeof tableOrId === "string"
        ? ui.tables.find((entry) => entry.id === tableOrId)
        : tableOrId;
    if (!table) {
      showToast("这个表格已经不存在了。", { type: "error" });
      return;
    }

    uidOrphanSaveTimer();
    ui.activeTableId = table.id;
    ui.tableDraft = {
      ...table,
      columns: [...(table.columns || ["列 1"])],
      rows: (table.rows || []).map((row) => [...row]),
    };
    if (!ui.tableDraft.columns.length) {
      ui.tableDraft.columns = ["列 1"];
    }
    if (!ui.tableDraft.rows.length) {
      ui.tableDraft.rows = [];
    }
    ui.tableDirty = false;

    dom.tablesListView.hidden = true;
    dom.tablesEditorView.hidden = false;
    dom.tablesBackBtn.hidden = false;
    dom.tablesNewBtn.hidden = true;
    dom.tablesHeading.textContent = "编辑表格";
    dom.tableTitleInput.value = ui.tableDraft.title;
    dom.tableDescInput.value = ui.tableDraft.description || "";
    setTableSaveStatus("已保存");
    renderTableEditor();
  }

  function uidOrphanSaveTimer() {
    if (ui.tableSaveTimer) {
      window.clearTimeout(ui.tableSaveTimer);
      ui.tableSaveTimer = null;
    }
  }

  function renderTableEditor() {
    if (!ui.tableDraft) {
      return;
    }
    const draft = ui.tableDraft;
    const headerFragment = document.createDocumentFragment();
    draft.columns.forEach((column, index) => {
      const th = document.createElement("th");
      const wrap = el("div", "table-col-head");
      const input = el("input", "table-col-input");
      input.type = "text";
      input.maxLength = 40;
      input.value = column;
      input.dataset.col = String(index);
      input.setAttribute("aria-label", `第 ${index + 1} 列的列名`);
      const remove = el("button", "table-col-delete");
      remove.type = "button";
      remove.dataset.action = "delete-column";
      remove.dataset.col = String(index);
      remove.setAttribute("aria-label", `删除第 ${index + 1} 列`);
      remove.title = "删除这一列";
      remove.appendChild(createSvgIcon("close"));
      wrap.append(input, remove);
      th.appendChild(wrap);
      headerFragment.appendChild(th);
    });
    const actionHead = document.createElement("th");
    actionHead.className = "table-row-actions-head";
    actionHead.textContent = "";
    headerFragment.appendChild(actionHead);
    dom.tableHeaderRow.replaceChildren(headerFragment);

    const bodyFragment = document.createDocumentFragment();
    if (!draft.rows.length) {
      const emptyRow = document.createElement("tr");
      emptyRow.className = "table-empty-row";
      const cell = document.createElement("td");
      cell.colSpan = draft.columns.length + 1;
      cell.textContent = "还没有行，点击「添加行」开始记录。";
      emptyRow.appendChild(cell);
      bodyFragment.appendChild(emptyRow);
    } else {
      draft.rows.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");
        draft.columns.forEach((_, columnIndex) => {
          const td = document.createElement("td");
          const textarea = el("textarea", "table-cell-input");
          textarea.rows = 2;
          textarea.value = row[columnIndex] || "";
          textarea.dataset.row = String(rowIndex);
          textarea.dataset.col = String(columnIndex);
          textarea.setAttribute(
            "aria-label",
            `第 ${rowIndex + 1} 行，${draft.columns[columnIndex]}`,
          );
          td.appendChild(textarea);
          tr.appendChild(td);
        });
        const actionCell = document.createElement("td");
        actionCell.className = "table-row-delete-cell";
        const remove = el("button", "table-row-delete");
        remove.type = "button";
        remove.dataset.action = "delete-row";
        remove.dataset.row = String(rowIndex);
        remove.setAttribute("aria-label", `删除第 ${rowIndex + 1} 行`);
        remove.title = "删除这一行";
        remove.appendChild(createSvgIcon("trash"));
        actionCell.appendChild(remove);
        tr.appendChild(actionCell);
        bodyFragment.appendChild(tr);
      });
    }
    dom.tableBody.replaceChildren(bodyFragment);
    window.requestAnimationFrame(autoGrowTableCells);
  }

  function addTableRow() {
    if (!ui.tableDraft) {
      return;
    }
    if (ui.tableDraft.rows.length >= 500) {
      showToast("一张表格最多 500 行。", { type: "error" });
      return;
    }
    ui.tableDraft.rows.push(ui.tableDraft.columns.map(() => ""));
    renderTableEditor();
    markTableDirty();
    const rowIndex = ui.tableDraft.rows.length - 1;
    window.requestAnimationFrame(() => {
      dom.tableBody
        .querySelector(`[data-row="${rowIndex}"][data-col="0"]`)
        ?.focus();
    });
  }

  function addTableColumn() {
    if (!ui.tableDraft) {
      return;
    }
    if (ui.tableDraft.columns.length >= 20) {
      showToast("一张表格最多 20 列。", { type: "error" });
      return;
    }
    const columnIndex = ui.tableDraft.columns.length;
    ui.tableDraft.columns.push(`列 ${columnIndex + 1}`);
    for (const row of ui.tableDraft.rows) {
      row.push("");
    }
    renderTableEditor();
    markTableDirty();
    window.requestAnimationFrame(() => {
      dom.tableHeaderRow
        .querySelector(`[data-col="${columnIndex}"]`)
        ?.focus();
    });
  }

  function deleteTableColumn(columnIndex) {
    if (!ui.tableDraft) {
      return;
    }
    if (ui.tableDraft.columns.length <= 1) {
      showToast("至少保留一列。", { type: "error" });
      return;
    }
    const hasContent = ui.tableDraft.rows.some(
      (row) => (row[columnIndex] || "").trim() !== "",
    );
    if (
      hasContent &&
      !window.confirm("这一列还有内容，确定删除整列吗？")
    ) {
      return;
    }
    ui.tableDraft.columns.splice(columnIndex, 1);
    for (const row of ui.tableDraft.rows) {
      row.splice(columnIndex, 1);
    }
    renderTableEditor();
    markTableDirty();
  }

  function deleteTableRow(rowIndex) {
    if (!ui.tableDraft) {
      return;
    }
    const hasContent = (ui.tableDraft.rows[rowIndex] || []).some(
      (cell) => (cell || "").trim() !== "",
    );
    if (hasContent && !window.confirm("这一行还有内容，确定删除吗？")) {
      return;
    }
    ui.tableDraft.rows.splice(rowIndex, 1);
    renderTableEditor();
    markTableDirty();
  }

  function autoGrowTableCells() {
    for (const textarea of dom.tableBody.querySelectorAll(".table-cell-input")) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
    }
  }

  function setTableSaveStatus(text, mode = "") {
    dom.tableSaveStatus.textContent = text;
    dom.tableSaveStatus.classList.toggle("is-saving", mode === "saving");
    dom.tableSaveStatus.classList.toggle("is-error", mode === "error");
  }

  function markTableDirty() {
    if (!ui.tableDraft) {
      return;
    }
    ui.tableDirty = true;
    setTableSaveStatus("未保存");
    uidOrphanSaveTimer();
    ui.tableSaveTimer = window.setTimeout(() => {
      flushTableSave();
    }, 650);
  }

  function buildTablePayload() {
    return {
      title: dom.tableTitleInput.value.trim() || "未命名表格",
      description: dom.tableDescInput.value.trim(),
      columns: [...ui.tableDraft.columns],
      rows: ui.tableDraft.rows.map((row) =>
        ui.tableDraft.columns.map((_, index) => row[index] || ""),
      ),
    };
  }

  async function flushTableSave() {
    uidOrphanSaveTimer();
    if (!ui.tableDraft || !ui.activeTableId) {
      return;
    }
    if (ui.tableSaving) {
      await new Promise((resolve) => {
        const wait = () => {
          if (ui.tableSaving) {
            window.setTimeout(wait, 80);
          } else {
            resolve();
          }
        };
        wait();
      });
    }
    if (!ui.tableDirty || !ui.tableDraft) {
      return;
    }

    const tableId = ui.activeTableId;
    const payload = buildTablePayload();
    ui.tableDirty = false;
    ui.tableSaving = true;
    setTableSaveStatus("保存中…", "saving");

    try {
      const saved = await window.KnowledgeAPI.updateTable(tableId, payload);
      const index = ui.tables.findIndex((table) => table.id === tableId);
      if (index >= 0) {
        ui.tables[index] = saved;
      }
      if (ui.tableDraft && ui.activeTableId === tableId) {
        ui.tableDraft.updatedAt = saved.updatedAt;
        if (!ui.tableDirty) {
          setTableSaveStatus("已保存");
        }
      }
    } catch (error) {
      ui.tableDirty = true;
      setTableSaveStatus("保存失败", "error");
      if (!error || error.status !== 401) {
        showApiError(error, "表格保存失败，请稍后重试。");
      }
    } finally {
      ui.tableSaving = false;
    }
  }

  async function backToTablesList() {
    await flushTableSave();
    showTablesList();
  }

  async function closeTablesDialog() {
    if (!dom.tablesDialog.open) {
      return;
    }
    await flushTableSave();
    dom.tablesDialog.close();
  }

  async function deleteActiveTable() {
    if (!ui.tableDraft) {
      return;
    }
    const title = ui.tableDraft.title || "未命名表格";
    if (!window.confirm(`确定删除表格《${title}》吗？`)) {
      return;
    }
    dom.deleteTableBtn.disabled = true;
    try {
      await window.KnowledgeAPI.removeTable(ui.tableDraft.id);
      ui.tables = ui.tables.filter((table) => table.id !== ui.tableDraft.id);
      showToast("表格已删除。");
      showTablesList();
    } catch (error) {
      showApiError(error, "删除表格失败，请稍后重试。");
    } finally {
      dom.deleteTableBtn.disabled = false;
    }
  }

  function loadPreferences() {
    try {
      const rawPrefs = window.localStorage.getItem(PREFS_KEY);
      if (rawPrefs) {
        const prefs = JSON.parse(rawPrefs);
        if (prefs && ["updated", "created", "title"].includes(prefs.sort)) {
          state.sort = prefs.sort;
        }
        if (prefs && ["grid", "list", "memory"].includes(prefs.view)) {
          state.view = prefs.view;
        }
        if (prefs && typeof prefs.memoryHideAnswers === "boolean") {
          state.memoryHideAnswers = prefs.memoryHideAnswers;
        }
      }
    } catch (error) {
      /* 偏好读取失败不影响知识库数据 */
    }
  }

  function savePreferences() {
    try {
      window.localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          sort: state.sort,
          view: state.view,
          memoryHideAnswers: state.memoryHideAnswers,
        }),
      );
    } catch (error) {
      /* 偏好不是关键数据，静默失败 */
    }
  }

  async function refreshKnowledge({ silent = false } = {}) {
    if (!silent) {
      state.loading = true;
      state.loadError = false;
      setDbStatus("loading");
      render();
    }

    try {
      const items = await window.KnowledgeAPI.list();
      state.items = items
        .map((item) => normalizeApiItem(item))
        .filter(Boolean);
      state.loading = false;
      state.loadError = false;
      setDbStatus("ok");
      render();
      if (!state.legacyMigrationChecked) {
        state.legacyMigrationChecked = true;
        migrateLegacyLocalData();
      }
      return true;
    } catch (error) {
      if (error && error.status === 401) {
        handleSessionExpired();
        return false;
      }
      state.loading = false;
      state.loadError = true;
      setDbStatus("error");
      dom.serverErrorDetail.textContent = error.message || "";
      render();
      return false;
    }
  }

  function normalizeApiItem(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const id = String(raw.id || "");
    if (!id) {
      return null;
    }
    return {
      id,
      title: String(raw.title || "未命名知识点"),
      content: typeof raw.content === "string" ? raw.content : "",
      mnemonic: typeof raw.mnemonic === "string" ? raw.mnemonic : "",
      category: typeof raw.category === "string" ? raw.category : "",
      tags: Array.isArray(raw.tags)
        ? raw.tags.filter((tag) => typeof tag === "string")
        : [],
      source: typeof raw.source === "string" ? raw.source : "",
      favorite: Boolean(raw.favorite),
      mastered: Boolean(raw.mastered),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    };
  }

  async function migrateLegacyLocalData() {
    if (!state.user) {
      return;
    }

    // 迁移标记按用户保存：旧账号被删除后，新账号仍可回收浏览器里的旧数据。
    const migrationKey = `${LEGACY_MIGRATION_KEY}.${state.user.id}`;
    let raw = null;
    try {
      if (window.localStorage.getItem(migrationKey) === "1") {
        return;
      }
      raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      return;
    }

    const markDone = () => {
      try {
        window.localStorage.setItem(migrationKey, "1");
      } catch (error) {
        /* 迁移标记失败不阻塞主流程 */
      }
    };

    if (!raw || state.items.length > 0) {
      markDone();
      return;
    }

    let list = [];
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray(parsed.items)
          ? parsed.items
          : [];
    } catch (error) {
      markDone();
      return;
    }

    if (!list.length) {
      markDone();
      return;
    }

    try {
      const result = await window.KnowledgeAPI.importItems(list.slice(0, 2000));
      markDone();
      const items = await window.KnowledgeAPI.list();
      state.items = items.map((item) => normalizeApiItem(item)).filter(Boolean);
      setDbStatus("ok");
      render();
      if (result.added + result.updated > 0) {
        showToast(
          `已将 ${result.added + result.updated} 条浏览器旧数据迁移到 MySQL。`,
          { duration: 6000 },
        );
      }
    } catch (error) {
      if (error && error.status === 422) {
        markDone();
      }
      showToast(
        "检测到浏览器旧数据，但自动迁移失败。可稍后刷新重试，或导出旧数据后手动导入。",
        { type: "error", duration: 6500 },
      );
    }
  }

  function setDbStatus(mode) {
    dom.dbStatusDot.classList.toggle("is-loading", mode === "loading");
    dom.dbStatusDot.classList.toggle("is-error", mode === "error");

    if (mode === "ok") {
      dom.dbStatusText.textContent = "已连接 MySQL · 自动保存";
    } else if (mode === "error") {
      dom.dbStatusText.textContent = "MySQL 连接失败";
    } else {
      dom.dbStatusText.textContent = "正在连接 MySQL…";
    }
  }

  function setSaving(active) {
    state.saving = active;
    const saveButton = document.getElementById("saveBtn");
    if (!saveButton) {
      return;
    }
    saveButton.disabled = active;
    dom.editorCancel.disabled = active;
    dom.editorClose.disabled = active;
    if (active) {
      dom.saveBtnText.textContent = "保存中…";
    } else {
      dom.saveBtnText.textContent = ui.editingId ? "保存修改" : "保存知识点";
    }
  }

  function showApiError(error, fallback = "操作失败，请稍后重试。") {
    if (error && error.status === 401) {
      return;
    }
    const message = error && error.message ? error.message : fallback;
    if (!error || !error.status || error.status >= 500) {
      setDbStatus("error");
    }
    showToast(message, { type: "error", duration: 5000 });
  }

  /* =========================================================
     工具函数
     ========================================================= */

  function el(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function createSvgIcon(name, className = "icon") {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", `#icon-${name}`);
    svg.appendChild(use);
    return svg;
  }

  function iconButton(name, label, action, className = "icon-button") {
    const button = el("button", className);
    button.type = "button";
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.appendChild(createSvgIcon(name));
    return button;
  }

  function parseTags(value) {
    let source = [];
    if (Array.isArray(value)) {
      source = value;
    } else if (typeof value === "string") {
      source = value.split(/[,，、;；\n]/);
    }

    const result = [];
    const seen = new Set();
    for (const rawTag of source) {
      if (typeof rawTag !== "string" && typeof rawTag !== "number") {
        continue;
      }
      const tag = String(rawTag)
        .replace(/^#+/, "")
        .replace(/[\u0000-\u001f]/g, "")
        .trim()
        .slice(0, MAX_TAG_LENGTH);
      if (!tag) {
        continue;
      }
      const key = tag.toLocaleLowerCase("zh-CN");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(tag);
      if (result.length >= MAX_TAGS) {
        break;
      }
    }
    return result;
  }

  function categoryKey(item) {
    return item.category || UNCATEGORIZED;
  }

  function categoryLabel(key) {
    return key === UNCATEGORIZED ? "未分类" : key;
  }

  function categoryColor(key) {
    if (key === UNCATEGORIZED) {
      return "#8b948e";
    }
    if (KNOWN_CATEGORY_COLORS[key]) {
      return KNOWN_CATEGORY_COLORS[key];
    }
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) {
      hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
    }
    return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
  }

  function fullDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function relativeTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const diff = Date.now() - date.getTime();
    if (diff < 60 * 1000) {
      return "刚刚";
    }
    const minutes = Math.floor(diff / (60 * 1000));
    if (minutes < 60) {
      return `${minutes} 分钟前`;
    }
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 24) {
      return `${hours} 小时前`;
    }
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 1) {
      return "昨天";
    }
    if (days < 7) {
      return `${days} 天前`;
    }
    const now = new Date();
    if (date.getFullYear() === now.getFullYear()) {
      return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
    }
    return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  }

  function truncate(value, length) {
    return value.length > length ? `${value.slice(0, length)}…` : value;
  }

  function isTypingTarget(target) {
    if (!target) {
      return false;
    }
    const tagName = target.tagName;
    return (
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT" ||
      target.isContentEditable
    );
  }

  function anyDialogOpen() {
    return dom.editorDialog.open || dom.deleteDialog.open || dom.tablesDialog.open;
  }

  /* =========================================================
     渲染
     ========================================================= */

  function render() {
    const visibleItems = getVisibleItems();
    renderSidebar();
    renderHeading(visibleItems);
    renderFilterBar();
    renderResultNote(visibleItems);
    renderCards(visibleItems);
    renderCategoryOptions();
    updateSearchUI();
    syncPreferenceControls();
  }

  function getVisibleItems() {
    const tokens = state.query
      .toLocaleLowerCase("zh-CN")
      .split(/\s+/)
      .filter(Boolean);

    const filtered = state.items.filter((item) => {
      if (state.filter === "favorites" && !item.favorite) {
        return false;
      }
      if (state.category && categoryKey(item) !== state.category) {
        return false;
      }
      if (state.tag && !item.tags.includes(state.tag)) {
        return false;
      }
      if (tokens.length) {
        const haystack = [
          item.title,
          item.content,
          item.mnemonic,
          item.category,
          item.tags.join(" "),
          item.source,
        ]
          .join(" ")
          .toLocaleLowerCase("zh-CN");
        if (!tokens.every((token) => haystack.includes(token))) {
          return false;
        }
      }
      return true;
    });

    return filtered.sort((left, right) => {
      if (state.sort === "title") {
        return left.title.localeCompare(right.title, "zh-CN");
      }
      if (state.sort === "created") {
        return new Date(right.createdAt) - new Date(left.createdAt);
      }
      return new Date(right.updatedAt) - new Date(left.updatedAt);
    });
  }

  function getCategories() {
    const map = new Map();
    for (const item of state.items) {
      const key = categoryKey(item);
      const current = map.get(key) || {
        key,
        label: categoryLabel(key),
        count: 0,
        color: categoryColor(key),
      };
      current.count += 1;
      map.set(key, current);
    }
    return Array.from(map.values()).sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label, "zh-CN"),
    );
  }

  function getTags() {
    const map = new Map();
    for (const item of state.items) {
      for (const tag of item.tags) {
        map.set(tag, (map.get(tag) || 0) + 1);
      }
    }
    return Array.from(map.entries()).sort(
      (left, right) =>
        right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"),
    );
  }

  function renderSidebar() {
    const favoriteCount = state.items.filter((item) => item.favorite).length;
    dom.countAll.textContent = String(state.items.length);
    dom.countFavorites.textContent = String(favoriteCount);
    dom.navAll.classList.toggle("is-active", state.filter === "all");
    dom.navFavorites.classList.toggle("is-active", state.filter === "favorites");
    dom.navAll.setAttribute(
      "aria-pressed",
      state.filter === "all" ? "true" : "false",
    );
    dom.navFavorites.setAttribute(
      "aria-pressed",
      state.filter === "favorites" ? "true" : "false",
    );

    const categories = getCategories();
    const categoryFragment = document.createDocumentFragment();
    if (!categories.length) {
      categoryFragment.appendChild(
        el("p", "sidebar-empty", "添加知识点后，分类会自动出现在这里。"),
      );
    } else {
      for (const category of categories) {
        const button = el("button", "category-item");
        button.type = "button";
        button.dataset.category = category.key;
        button.style.setProperty("--dot-color", category.color);
        if (state.category === category.key) {
          button.classList.add("is-active");
        }
        button.setAttribute(
          "aria-pressed",
          state.category === category.key ? "true" : "false",
        );

        const name = el("span", "category-name");
        const dot = el("span", "category-dot");
        const label = el("span", null, category.label);
        name.append(dot, label);

        const count = el("span", "category-count", String(category.count));
        button.append(name, count);
        categoryFragment.appendChild(button);
      }
    }
    dom.categoryList.replaceChildren(categoryFragment);

    const tags = getTags();
    const tagFragment = document.createDocumentFragment();
    if (!tags.length) {
      tagFragment.appendChild(
        el("p", "sidebar-empty", "还没有标签，编辑时用逗号添加。"),
      );
    } else {
      const visibleTags = state.showAllTags ? tags : tags.slice(0, VISIBLE_TAG_LIMIT);
      for (const [tag, count] of visibleTags) {
        const button = el("button", "tag-chip");
        button.type = "button";
        button.dataset.tag = tag;
        button.title = `${tag}（${count} 条）`;
        if (state.tag === tag) {
          button.classList.add("is-active");
        }
        button.setAttribute("aria-pressed", state.tag === tag ? "true" : "false");
        const hash = el("span", "tag-hash", "#");
        const name = el("span", "tag-text", tag);
        button.append(hash, name);
        tagFragment.appendChild(button);
      }
      if (tags.length > VISIBLE_TAG_LIMIT) {
        const more = el(
          "button",
          "tag-more",
          state.showAllTags ? "收起" : `更多 +${tags.length - VISIBLE_TAG_LIMIT}`,
        );
        more.type = "button";
        more.dataset.tagMore = "true";
        tagFragment.appendChild(more);
      }
    }
    dom.tagCloud.replaceChildren(tagFragment);
  }

  function renderHeading(visibleItems) {
    let eyebrow = "KNOWLEDGE BASE";
    let title = "全部知识点";
    let subtitle = "把散落的想法，收进同一座岛屿。";

    if (state.query) {
      eyebrow = "SEARCH";
      title = "搜索结果";
      subtitle = `找到 ${visibleItems.length} 条与「${truncate(state.query, 26)}」相关的知识点。`;
    } else if (state.filter === "favorites") {
      eyebrow = "FAVORITES";
      title = "我的收藏";
      const count = state.items.filter((item) => item.favorite).length;
      subtitle = `收藏了 ${count} 条知识点，常回来看看。`;
    } else if (state.filter === "category" && state.category) {
      eyebrow = "CATEGORY";
      title = categoryLabel(state.category);
      subtitle = `这个分类下有 ${visibleItems.length} 条知识点。`;
    } else if (state.tag) {
      eyebrow = "TAG";
      title = `#${state.tag}`;
      subtitle = `带有这个标签的 ${visibleItems.length} 条知识点。`;
    } else if (!state.items.length) {
      subtitle = "把散落的想法，收进同一座岛屿。";
    }

    if (state.loading) {
      eyebrow = "CONNECTING";
      subtitle = "正在从 MySQL 读取知识点…";
    } else if (state.loadError) {
      eyebrow = "CONNECTION LOST";
      subtitle = "暂时无法读取数据，请检查数据库服务。";
    }

    dom.pageEyebrow.textContent = eyebrow;
    dom.pageTitle.textContent = title;
    dom.pageSubtitle.textContent = subtitle;
    document.title = `${title} · 拾知`;
  }

  function renderFilterBar() {
    const chips = [];

    if (state.query) {
      chips.push({
        label: `搜索：${truncate(state.query, 18)}`,
        className: "is-query",
        clear: () => {
          state.query = "";
          dom.searchInput.value = "";
          render();
          dom.searchInput.focus();
        },
      });
    }

    if (state.filter === "category" && state.category) {
      chips.push({
        label: categoryLabel(state.category),
        className: "",
        clear: () => {
          state.filter = "all";
          state.category = null;
          render();
        },
      });
    }

    if (state.tag) {
      chips.push({
        label: `#${state.tag}`,
        className: "is-tag",
        clear: () => {
          state.tag = null;
          render();
        },
      });
    }

    if (state.filter === "favorites") {
      chips.push({
        label: "我的收藏",
        className: "is-favorites",
        clear: () => {
          state.filter = "all";
          render();
        },
      });
    }

    dom.filterBar.hidden = chips.length === 0;
    if (!chips.length) {
      dom.filterBar.replaceChildren();
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const chipInfo of chips) {
      const chip = el("span", `filter-chip ${chipInfo.className}`.trim());
      const label = el("span", null, chipInfo.label);
      const clear = el("button");
      clear.type = "button";
      clear.setAttribute("aria-label", `移除筛选：${chipInfo.label}`);
      clear.title = "移除筛选";
      clear.appendChild(createSvgIcon("close"));
      clear.addEventListener("click", chipInfo.clear);
      chip.append(label, clear);
      fragment.appendChild(chip);
    }
    dom.filterBar.replaceChildren(fragment);
  }

  function renderResultNote(visibleItems) {
    dom.resultNote.replaceChildren();

    if (state.loading) {
      dom.resultNote.hidden = false;
      dom.resultNote.append(
        el("span", "result-rule"),
        document.createTextNode("正在从 MySQL 读取知识点…"),
      );
      return;
    }

    if (state.loadError) {
      dom.resultNote.hidden = true;
      return;
    }

    dom.resultNote.hidden = state.items.length === 0;
    if (!state.items.length) {
      return;
    }

    const count = el("strong", null, String(visibleItems.length));

    if (state.query || state.category || state.tag || state.filter !== "all") {
      dom.resultNote.append(
        document.createTextNode("筛选出 "),
        count,
        document.createTextNode(` 条 / 共 ${state.items.length} 条`),
      );
    } else {
      const categoryCount = getCategories().length;
      dom.resultNote.append(
        document.createTextNode("共 "),
        count,
        document.createTextNode(" 条知识点"),
        el("span", "result-rule"),
        document.createTextNode(`${categoryCount} 个分类`),
      );
    }
  }

  function renderCards(visibleItems) {
    dom.cardGrid.classList.toggle("is-list", state.view === "list");
    const isMemoryView = state.view === "memory";

    if (state.loading) {
      const skeletonFragment = document.createDocumentFragment();
      for (let index = 0; index < 6; index += 1) {
        skeletonFragment.appendChild(createSkeletonCard());
      }
      dom.cardGrid.replaceChildren(skeletonFragment);
      dom.cardGrid.hidden = false;
      dom.memoryView.hidden = true;
      dom.emptyState.hidden = true;
      dom.noResults.hidden = true;
      dom.serverError.hidden = true;
      return;
    }

    if (state.loadError) {
      dom.cardGrid.replaceChildren();
      dom.cardGrid.hidden = true;
      dom.memoryView.hidden = true;
      dom.emptyState.hidden = true;
      dom.noResults.hidden = true;
      dom.serverError.hidden = false;
      return;
    }

    dom.serverError.hidden = true;
    const isCompletelyEmpty = state.items.length === 0;

    if (isMemoryView) {
      dom.cardGrid.replaceChildren();
      dom.cardGrid.hidden = true;
      dom.emptyState.hidden = !isCompletelyEmpty;
      dom.noResults.hidden = isCompletelyEmpty || visibleItems.length > 0;
      dom.memoryView.hidden = isCompletelyEmpty || visibleItems.length === 0;
      if (!isCompletelyEmpty && visibleItems.length) {
        renderMemoryTable(visibleItems);
      }
      return;
    }

    dom.memoryView.hidden = true;
    const fragment = document.createDocumentFragment();
    for (const item of visibleItems) {
      fragment.appendChild(createCard(item));
    }
    dom.cardGrid.replaceChildren(fragment);
    dom.cardGrid.hidden = visibleItems.length === 0;
    dom.emptyState.hidden = !isCompletelyEmpty;
    dom.noResults.hidden = isCompletelyEmpty || visibleItems.length > 0;
  }

  function renderMemoryTable(visibleItems) {
    const items = seededShuffle(
      state.memoryOnlyUnmastered
        ? visibleItems.filter((item) => !item.mastered)
        : visibleItems,
    );

    dom.hideAnswersToggle.checked = state.memoryHideAnswers;
    dom.onlyUnmasteredToggle.checked = state.memoryOnlyUnmastered;
    dom.memoryCount.textContent = `${items.length} 条`;
    dom.memoryTableWrap.hidden = items.length === 0;
    dom.memoryEmpty.hidden = !(
      state.memoryOnlyUnmastered && items.length === 0
    );

    const fragment = document.createDocumentFragment();
    for (const item of items) {
      fragment.appendChild(createMemoryRow(item));
    }
    dom.memoryTableBody.replaceChildren(fragment);
  }

  function createMemoryRow(item) {
    const row = el("tr", item.mastered ? "is-mastered" : "");
    row.dataset.id = item.id;

    const categoryCell = el("td");
    const category = el("span", "category-pill", categoryLabel(categoryKey(item)));
    category.style.setProperty("--cat-color", categoryColor(categoryKey(item)));
    categoryCell.appendChild(category);

    const promptCell = el("td");
    const prompt = el("div", "memory-prompt");
    const title = el("button", "memory-title", item.title);
    title.type = "button";
    title.dataset.action = "edit";
    title.dataset.id = item.id;
    title.title = "编辑这条知识点";
    const edit = iconButton("edit", "编辑知识点", "edit", "memory-edit");
    edit.dataset.id = item.id;
    prompt.append(title, edit);
    promptCell.appendChild(prompt);

    if (item.tags.length) {
      const tags = el("div", "memory-tags");
      for (const tag of item.tags) {
        tags.appendChild(el("span", "memory-tag", `#${tag}`));
      }
      promptCell.appendChild(tags);
    }

    const mnemonicCell = el("td");
    const mnemonic = el(
      "div",
      `memory-mnemonic${item.mnemonic ? "" : " is-empty"}`,
      item.mnemonic || "还没有联想提示",
    );
    mnemonicCell.appendChild(mnemonic);

    const answerCell = el(
      "td",
      `memory-answer-cell${state.memoryHideAnswers ? " is-concealed" : ""}`,
    );
    const answer = el(
      "div",
      `memory-answer-content${item.content ? "" : " is-empty"}`,
      item.content || "暂无正文",
    );
    const reveal = el("button", "memory-reveal", "点击回忆答案");
    reveal.type = "button";
    reveal.dataset.action = "reveal";
    reveal.dataset.id = item.id;
    answerCell.append(answer, reveal);

    const masteredCell = el("td");
    const mastered = el(
      "button",
      `memory-mastery${item.mastered ? " is-mastered" : ""}`,
    );
    mastered.type = "button";
    mastered.dataset.action = "mastered";
    mastered.dataset.id = item.id;
    mastered.setAttribute("aria-pressed", String(item.mastered));
    mastered.appendChild(createSvgIcon("check"));
    mastered.appendChild(
      document.createTextNode(item.mastered ? "已掌握" : "还没记住"),
    );
    masteredCell.appendChild(mastered);

    row.append(categoryCell, promptCell, mnemonicCell, answerCell, masteredCell);
    return row;
  }

  function seededShuffle(items) {
    if (!state.memorySeed) {
      return items;
    }
    return [...items].sort(
      (left, right) =>
        hashString(`${left.id}:${state.memorySeed}`) -
        hashString(`${right.id}:${state.memorySeed}`),
    );
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createSkeletonCard() {
    const card = el("div", "skeleton-card");
    card.setAttribute("aria-hidden", "true");
    card.append(
      el("span", "skeleton-line is-pill"),
      el("span", "skeleton-line is-title"),
      el("span", "skeleton-line is-wide"),
      el("span", "skeleton-line is-medium"),
      el("span", "skeleton-line is-short"),
      el("span", "skeleton-line is-footer"),
    );
    return card;
  }

  function createCard(item) {
    const key = categoryKey(item);
    const card = el("article", "knowledge-card");
    card.dataset.id = item.id;
    card.style.setProperty("--cat-color", categoryColor(key));
    card.setAttribute("aria-label", `知识点：${item.title}`);

    const top = el("div", "card-top");
    const category = el("span", "category-pill", categoryLabel(key));
    category.title = `分类：${categoryLabel(key)}`;

    const favorite = iconButton(
      "star",
      item.favorite ? "取消收藏" : "加入收藏",
      "favorite",
      "favorite-button",
    );
    favorite.dataset.id = item.id;
    favorite.setAttribute("aria-pressed", item.favorite ? "true" : "false");
    if (item.favorite) {
      favorite.classList.add("is-favorite");
    }
    top.append(category, favorite);

    const titleButton = el("button", "card-title-button", item.title);
    titleButton.type = "button";
    titleButton.dataset.action = "edit";
    titleButton.dataset.id = item.id;
    titleButton.title = "编辑这条知识点";

    const preview = item.content.replace(/\s+/g, " ").trim();
    const content = el(
      "p",
      `card-content${preview ? "" : " is-empty"}`,
      preview || "暂无正文，点击编辑补充。",
    );

    const tags = el("div", "card-tags");
    for (const tag of item.tags) {
      const tagButton = el("button", "card-tag", `#${tag}`);
      tagButton.type = "button";
      tagButton.dataset.action = "tag";
      tagButton.dataset.tag = tag;
      tagButton.title = `筛选标签：${tag}`;
      tags.appendChild(tagButton);
    }

    const footer = el("div", "card-footer");
    const meta = el("div", "card-meta");
    const time = el("time", null, `更新于 ${relativeTime(item.updatedAt)}`);
    time.dateTime = item.updatedAt;
    time.title = fullDate(item.updatedAt);
    meta.appendChild(time);

    if (item.source) {
      const source = createSourceNode(item.source);
      meta.appendChild(source);
    }

    const actions = el("div", "card-actions");
    const copy = iconButton("copy", "复制知识点", "copy", "card-action");
    copy.dataset.id = item.id;
    const edit = iconButton("edit", "编辑知识点", "edit", "card-action");
    edit.dataset.id = item.id;
    const remove = iconButton("trash", "删除知识点", "delete", "card-action is-danger");
    remove.dataset.id = item.id;
    actions.append(copy, edit, remove);

    footer.append(meta, actions);
    card.append(top, titleButton, content, tags, footer);
    return card;
  }

  function createSourceNode(source) {
    const isLink = /^https?:\/\//i.test(source);
    const node = el(
      isLink ? "a" : "span",
      "source-link",
    );
    node.title = source;
    if (isLink) {
      node.href = source;
      node.target = "_blank";
      node.rel = "noopener noreferrer";
    }
    node.appendChild(createSvgIcon("link"));
    node.appendChild(el("span", null, source));
    return node;
  }

  function renderCategoryOptions() {
    const categories = getCategories().filter(
      (category) => category.key !== UNCATEGORIZED,
    );
    const fragment = document.createDocumentFragment();
    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category.label;
      fragment.appendChild(option);
    }
    dom.categoryOptions.replaceChildren(fragment);
  }

  function updateSearchUI() {
    const hasQuery = state.query.length > 0;
    dom.searchClear.hidden = !hasQuery;
    dom.searchKbd.hidden = hasQuery;
    dom.searchBox.classList.toggle("has-query", hasQuery);
    if (dom.searchInput.value !== state.query) {
      dom.searchInput.value = state.query;
    }
  }

  function syncPreferenceControls() {
    dom.sortSelect.value = state.sort;
    dom.cardGrid.classList.toggle("is-list", state.view === "list");

    const isGrid = state.view === "grid";
    const isList = state.view === "list";
    const isMemory = state.view === "memory";
    dom.gridViewBtn.classList.toggle("is-active", isGrid);
    dom.listViewBtn.classList.toggle("is-active", isList);
    dom.memoryViewBtn.classList.toggle("is-active", isMemory);
    dom.gridViewBtn.setAttribute("aria-pressed", String(isGrid));
    dom.listViewBtn.setAttribute("aria-pressed", String(isList));
    dom.memoryViewBtn.setAttribute("aria-pressed", String(isMemory));
  }

  /* =========================================================
     筛选与导航
     ========================================================= */

  function resetFilters() {
    state.filter = "all";
    state.category = null;
    state.tag = null;
    state.query = "";
    state.showAllTags = false;
    dom.searchInput.value = "";
    render();
  }

  function selectAll() {
    resetFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectFavorites() {
    state.filter = "favorites";
    state.category = null;
    state.tag = null;
    render();
  }

  function selectCategory(key) {
    if (state.filter === "category" && state.category === key) {
      state.filter = "all";
      state.category = null;
      render();
      return;
    }
    state.filter = "category";
    state.category = key;
    state.tag = null;
    render();
  }

  function selectTag(tag) {
    if (state.tag === tag) {
      state.tag = null;
    } else {
      state.tag = tag;
    }
    render();
  }

  /* =========================================================
     编辑器
     ========================================================= */

  function openEditor(id = null) {
    let item = null;
    if (id) {
      item = state.items.find((entry) => entry.id === id) || null;
      if (!item) {
        showToast("这条知识点已经不存在了。", { type: "error" });
        return;
      }
    }

    ui.editingId = item ? item.id : null;
    dom.knowledgeForm.reset();
    dom.titleInput.value = item ? item.title : "";
    dom.categoryInput.value = item ? item.category : "";
    dom.tagInput.value = item ? item.tags.join("，") : "";
    dom.contentInput.value = item ? item.content : "";
    dom.mnemonicInput.value = item ? item.mnemonic : "";
    dom.sourceInput.value = item ? item.source : "";
    dom.favoriteInput.checked = item ? item.favorite : false;
    dom.editorEyebrow.textContent = item ? "EDIT NOTE" : "NEW NOTE";
    dom.editorTitle.textContent = item ? "编辑知识点" : "新建知识点";
    dom.saveBtnText.textContent = item ? "保存修改" : "保存知识点";
    clearTitleError();
    updateContentCount();
    updateMnemonicCount();

    ui.initialSnapshot = getFormSnapshot();
    dom.editorDialog.showModal();
    window.requestAnimationFrame(() => {
      dom.titleInput.focus();
      if (item) {
        const length = dom.titleInput.value.length;
        dom.titleInput.setSelectionRange(length, length);
      }
    });
  }

  function getFormSnapshot() {
    return JSON.stringify({
      title: dom.titleInput.value,
      category: dom.categoryInput.value,
      tags: dom.tagInput.value,
      content: dom.contentInput.value,
      mnemonic: dom.mnemonicInput.value,
      source: dom.sourceInput.value,
      favorite: dom.favoriteInput.checked,
    });
  }

  function isEditorDirty() {
    return getFormSnapshot() !== ui.initialSnapshot;
  }

  function closeEditor(force = false) {
    if (!dom.editorDialog.open) {
      return;
    }
    if (state.saving && !force) {
      return;
    }
    if (!force && isEditorDirty()) {
      const shouldClose = window.confirm("还有未保存的修改，确定要关闭吗？");
      if (!shouldClose) {
        return;
      }
    }
    dom.editorDialog.close();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (state.saving) {
      return;
    }

    const title = dom.titleInput.value.trim();
    const content = dom.contentInput.value.trim();
    const mnemonic = dom.mnemonicInput.value.trim();
    const category = dom.categoryInput.value.trim();
    const tags = parseTags(dom.tagInput.value);
    const source = dom.sourceInput.value.trim();
    const favorite = dom.favoriteInput.checked;

    if (!title) {
      dom.titleError.hidden = false;
      dom.titleInput.classList.add("is-invalid");
      dom.titleInput.setAttribute("aria-invalid", "true");
      dom.titleInput.focus();
      return;
    }

    clearTitleError();
    const payload = {
      title,
      content,
      mnemonic,
      category,
      tags,
      source,
      favorite,
    };
    const wasEditing = Boolean(ui.editingId);
    const editingId = ui.editingId;
    setSaving(true);

    try {
      if (wasEditing) {
        const saved = await window.KnowledgeAPI.update(editingId, payload);
        const normalized = normalizeApiItem(saved);
        if (normalized) {
          const index = state.items.findIndex((item) => item.id === editingId);
          if (index >= 0) {
            state.items[index] = normalized;
          } else {
            state.items.push(normalized);
          }
        }
      } else {
        const saved = await window.KnowledgeAPI.create(payload);
        const normalized = normalizeApiItem(saved);
        if (normalized) {
          state.items.push(normalized);
        }
        resetFilters();
      }

      setDbStatus("ok");
      render();
      closeEditor(true);
      showToast(wasEditing ? "知识点已更新并写入 MySQL。" : "知识点已写入 MySQL。");
    } catch (error) {
      showApiError(error, "保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  function clearTitleError() {
    dom.titleError.hidden = true;
    dom.titleInput.classList.remove("is-invalid");
    dom.titleInput.removeAttribute("aria-invalid");
  }

  function updateContentCount() {
    const count = dom.contentInput.value.length;
    dom.contentCount.textContent = `${count} 字`;
  }

  function updateMnemonicCount() {
    const count = dom.mnemonicInput.value.length;
    dom.mnemonicCount.textContent = `${count} 字`;
  }

  /* =========================================================
     删除 / 收藏 / 复制
     ========================================================= */

  function openDeleteDialog(id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    ui.pendingDeleteId = id;
    dom.deleteItemTitle.textContent = item.title;
    dom.deleteDialog.showModal();
  }

  async function confirmDelete() {
    const id = ui.pendingDeleteId;
    if (!id) {
      return;
    }
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) {
      dom.deleteDialog.close();
      return;
    }

    const removed = state.items[index];
    dom.deleteConfirm.disabled = true;
    dom.deleteCancel.disabled = true;
    dom.deleteConfirm.textContent = "删除中…";

    try {
      await window.KnowledgeAPI.remove(id);
      state.items.splice(index, 1);
      setDbStatus("ok");
      render();
      ui.pendingDeleteId = null;
      dom.deleteDialog.close();

      showToast(`已从 MySQL 删除《${truncate(removed.title, 18)}》`, {
        icon: "trash",
        duration: 8000,
        actionLabel: "撤销",
        onAction: async () => {
          if (state.items.some((item) => item.id === removed.id)) {
            return;
          }
          try {
            const restored = await window.KnowledgeAPI.create(removed);
            const normalized = normalizeApiItem(restored);
            if (normalized && !state.items.some((item) => item.id === normalized.id)) {
              state.items.push(normalized);
            }
            setDbStatus("ok");
            render();
            showToast("已恢复刚才删除的知识点。");
          } catch (error) {
            showApiError(error, "撤销失败，请刷新后重试。");
          }
        },
      });
    } catch (error) {
      showApiError(error, "删除失败，请稍后重试。");
    } finally {
      dom.deleteConfirm.disabled = false;
      dom.deleteCancel.disabled = false;
      dom.deleteConfirm.textContent = "确认删除";
    }
  }

  async function toggleFavorite(id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    const previous = item.favorite;
    const next = !previous;
    item.favorite = next;
    render();

    try {
      const saved = await window.KnowledgeAPI.setFavorite(id, next);
      const normalized = normalizeApiItem(saved);
      const index = state.items.findIndex((entry) => entry.id === id);
      if (index >= 0 && normalized) {
        state.items[index] = normalized;
      }
      setDbStatus("ok");
      render();
      showToast(next ? "已加入收藏。" : "已取消收藏。", {
        icon: "star",
        duration: 2500,
      });
    } catch (error) {
      const current = state.items.find((entry) => entry.id === id);
      if (current) {
        current.favorite = previous;
      }
      render();
      showApiError(error, "收藏操作失败，请稍后重试。");
    }
  }

  async function toggleMastered(id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    const previous = item.mastered;
    const next = !previous;
    item.mastered = next;
    render();

    try {
      const saved = await window.KnowledgeAPI.setMastered(id, next);
      const normalized = normalizeApiItem(saved);
      const index = state.items.findIndex((entry) => entry.id === id);
      if (index >= 0 && normalized) {
        state.items[index] = normalized;
      }
      setDbStatus("ok");
      render();
      showToast(next ? "已标记为掌握。" : "已移回待复习。", {
        icon: "check",
        duration: 2200,
      });
    } catch (error) {
      const current = state.items.find((entry) => entry.id === id);
      if (current) {
        current.mastered = previous;
      }
      render();
      showApiError(error, "更新掌握状态失败，请稍后重试。");
    }
  }

  async function copyKnowledge(id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    const text = [
      item.title,
      item.content,
      item.source ? `来源：${item.source}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        legacyCopy(text);
      }
      showToast("已复制到剪贴板。", { duration: 2200 });
    } catch (error) {
      showToast("复制失败，请手动选择内容。", { type: "error" });
    }
  }

  function legacyCopy(text) {
    const textarea = el("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand("copy");
    textarea.remove();
    if (!succeeded) {
      throw new Error("Copy command failed");
    }
  }

  /* =========================================================
     导入 / 导出 / 示例
     ========================================================= */

  function exportKnowledge() {
    if (!state.items.length) {
      showToast("当前还没有知识点可以导出。", { type: "error" });
      return;
    }

    const payload = {
      app: "拾知",
      version: 1,
      exportedAt: new Date().toISOString(),
      items: state.items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date();
    const stamp = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    link.href = url;
    link.download = `拾知-知识点-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`已导出 ${state.items.length} 条知识点。`);
  }

  async function importKnowledge(file) {
    if (!file) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("文件太大了，请选择 5 MB 以内的 JSON 备份。", {
        type: "error",
      });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch (error) {
      showToast("无法解析这个文件，请确认它是拾知导出的 JSON 备份。", {
        type: "error",
      });
      return;
    }

    const list = Array.isArray(parsed)
      ? parsed
      : parsed && Array.isArray(parsed.items)
        ? parsed.items
        : null;

    if (!list) {
      showToast("文件格式不对：没有找到知识点列表。", { type: "error" });
      return;
    }
    if (!list.length) {
      showToast("这个备份里没有知识点。", { type: "error" });
      return;
    }
    if (list.length > 2000) {
      showToast("一次最多导入 2000 条知识点，请拆分备份后再试。", {
        type: "error",
      });
      return;
    }

    dom.importBtn.disabled = true;
    try {
      const result = await window.KnowledgeAPI.importItems(list);
      state.filter = "all";
      state.category = null;
      state.tag = null;
      state.query = "";
      dom.searchInput.value = "";
      const loaded = await refreshKnowledge();
      if (!loaded) {
        showToast("导入已提交，但重新读取列表失败，请点重新连接。", {
          type: "error",
          duration: 6000,
        });
        return;
      }
      const skippedText = result.skipped
        ? `，跳过 ${result.skipped} 条无效记录`
        : "";
      showToast(
        `已写入 MySQL：新增 ${result.added} 条，更新 ${result.updated} 条${skippedText}。`,
        { duration: 5000 },
      );
    } catch (error) {
      showApiError(error, "导入失败，请检查文件后重试。");
    } finally {
      dom.importBtn.disabled = false;
    }
  }

  async function loadSamples() {
    const existingIds = new Set(state.items.map((item) => item.id));
    const samples = createSamples().filter(
      (sample) => !existingIds.has(sample.id),
    );
    if (!samples.length) {
      showToast("示例知识点已经在知识库里了。", { type: "error" });
      return;
    }

    dom.sampleBtn.disabled = true;
    try {
      await window.KnowledgeAPI.importItems(samples);
      state.filter = "all";
      state.category = null;
      state.tag = null;
      state.query = "";
      dom.searchInput.value = "";
      const loaded = await refreshKnowledge();
      if (!loaded) {
        showToast("示例已写入，但读取列表失败，请点重新连接。", {
          type: "error",
        });
        return;
      }
      showToast(`已载入 ${samples.length} 条示例到 MySQL，可随意编辑或删除。`, {
        duration: 4500,
      });
    } catch (error) {
      showApiError(error, "载入示例失败，请稍后重试。");
    } finally {
      dom.sampleBtn.disabled = false;
    }
  }

  function createSamples() {
    const now = Date.now();
    const ago = (hours) => new Date(now - hours * 60 * 60 * 1000).toISOString();
    return [
      {
        id: "sample-feynman",
        title: "费曼学习法",
        category: "学习",
        tags: ["学习方法", "输出"],
        source: "《别闹了，费曼先生》",
        favorite: true,
        content:
          "用最朴素的语言，向一个完全不懂的人解释一个概念。\n\n如果卡壳，说明理解还有缺口——回到材料，补上那一块，再讲一遍。\n\n关键不是「讲完」，而是让解释短到没有术语可以躲藏。",
        createdAt: ago(80),
        updatedAt: ago(2),
      },
      {
        id: "sample-focus-visible",
        title: "CSS：用 :focus-visible 保留键盘焦点",
        category: "编程",
        tags: ["CSS", "可访问性"],
        source: "https://developer.mozilla.org/",
        favorite: false,
        content:
          ":focus-visible 让键盘用户获得焦点时显示轮廓，而鼠标点击通常不会出现。\n\nbutton:focus-visible {\n  outline: 2px solid #236b59;\n  outline-offset: 2px;\n}\n\n用 :focus-visible 替代一刀切的 :focus，既照顾可访问性，也保留鼠标操作的干净视觉。",
        createdAt: ago(70),
        updatedAt: ago(26),
      },
      {
        id: "sample-writing",
        title: "写作的减法",
        category: "写作",
        tags: ["表达", "编辑"],
        source: "写作笔记",
        favorite: false,
        content:
          "初稿的任务是把想法倒出来，修改的任务是让读者少费一点力。\n\n先问：这句话删掉，意思会变吗？如果不会，就删。\n\n好文字往往不是写得更漂亮，而是更准确。",
        createdAt: ago(48),
        updatedAt: ago(48),
      },
      {
        id: "sample-pomodoro",
        title: "番茄钟不是计时器",
        category: "效率",
        tags: ["时间管理", "专注"],
        source: "《番茄工作法图解》",
        favorite: true,
        content:
          "番茄钟真正的价值不是 25 分钟，而是「一次只做一件事」的约定。\n\n一个番茄内被打断，就作废重来——这会逼你把注意力当成有限的资源。\n\n休息也不是奖励，是下一轮专注的准备。",
        createdAt: ago(120),
        updatedAt: ago(96),
      },
    ];
  }

  /* =========================================================
     Toast
     ========================================================= */

  function showToast(message, options = {}) {
    if (!dom.toastRegion) {
      return;
    }

    while (dom.toastRegion.children.length >= 3) {
      dom.toastRegion.firstElementChild.remove();
    }

    const toast = el("div", `toast${options.type === "error" ? " is-error" : ""}`);
    toast.setAttribute("role", "status");

    const iconWrap = el("span", "toast-icon");
    iconWrap.appendChild(
      createSvgIcon(options.icon || (options.type === "error" ? "close" : "check")),
    );

    const text = el("span", "toast-message", message);
    toast.append(iconWrap, text);

    let timer = null;
    let dismissed = false;

    const dismiss = () => {
      if (dismissed) {
        return;
      }
      dismissed = true;
      if (timer) {
        window.clearTimeout(timer);
      }
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 190);
    };

    const armTimer = () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      if (options.duration === 0) {
        return;
      }
      timer = window.setTimeout(dismiss, options.duration || 3400);
    };

    if (options.actionLabel && typeof options.onAction === "function") {
      const action = el("button", "toast-action", options.actionLabel);
      action.type = "button";
      action.addEventListener("click", () => {
        if (dismissed) {
          return;
        }
        dismiss();
        options.onAction();
      });
      toast.appendChild(action);
    }

    const close = el("button", "toast-close");
    close.type = "button";
    close.setAttribute("aria-label", "关闭提示");
    close.appendChild(createSvgIcon("close"));
    close.addEventListener("click", dismiss);
    toast.appendChild(close);

    toast.addEventListener("mouseenter", () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    });
    toast.addEventListener("mouseleave", armTimer);

    dom.toastRegion.appendChild(toast);
    armTimer();
  }

  /* =========================================================
     事件绑定
     ========================================================= */

  function bindEvents() {
    dom.newBtn.addEventListener("click", () => openEditor());
    dom.emptyAddBtn.addEventListener("click", () => openEditor());
    dom.sampleBtn.addEventListener("click", loadSamples);

    dom.brandLink.addEventListener("click", (event) => {
      event.preventDefault();
      selectAll();
    });

    dom.navAll.addEventListener("click", selectAll);
    dom.navFavorites.addEventListener("click", selectFavorites);
    dom.tablesNavBtn.addEventListener("click", openTablesDialog);

    dom.categoryList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) {
        return;
      }
      selectCategory(button.dataset.category);
    });

    dom.tagCloud.addEventListener("click", (event) => {
      const more = event.target.closest("[data-tag-more]");
      if (more) {
        state.showAllTags = !state.showAllTags;
        render();
        return;
      }
      const tagButton = event.target.closest("[data-tag]");
      if (!tagButton) {
        return;
      }
      selectTag(tagButton.dataset.tag);
    });

    dom.searchInput.addEventListener("input", () => {
      state.query = dom.searchInput.value;
      updateSearchUI();
      if (ui.searchTimer) {
        window.clearTimeout(ui.searchTimer);
      }
      ui.searchTimer = window.setTimeout(() => {
        render();
      }, 90);
    });

    dom.searchClear.addEventListener("click", () => {
      state.query = "";
      dom.searchInput.value = "";
      render();
      dom.searchInput.focus();
    });

    dom.sortSelect.addEventListener("change", () => {
      state.sort = dom.sortSelect.value;
      savePreferences();
      render();
    });

    dom.gridViewBtn.addEventListener("click", () => {
      state.view = "grid";
      savePreferences();
      render();
    });

    dom.listViewBtn.addEventListener("click", () => {
      state.view = "list";
      savePreferences();
      render();
    });

    dom.memoryViewBtn.addEventListener("click", () => {
      state.view = "memory";
      savePreferences();
      render();
    });

    dom.hideAnswersToggle.addEventListener("change", () => {
      state.memoryHideAnswers = dom.hideAnswersToggle.checked;
      savePreferences();
      render();
    });

    dom.onlyUnmasteredToggle.addEventListener("change", () => {
      state.memoryOnlyUnmastered = dom.onlyUnmasteredToggle.checked;
      render();
    });

    dom.shuffleMemoryBtn.addEventListener("click", () => {
      state.memorySeed = Date.now() % 1000000007;
      render();
    });

    dom.memoryTableBody.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) {
        return;
      }
      const action = actionButton.dataset.action;
      const id = actionButton.dataset.id;
      if (action === "edit") {
        openEditor(id);
      } else if (action === "reveal") {
        const answerCell = actionButton.closest(".memory-answer-cell");
        if (answerCell) {
          answerCell.classList.remove("is-concealed");
          actionButton.blur();
        }
      } else if (action === "mastered") {
        toggleMastered(id);
      }
    });

    dom.cardGrid.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) {
        return;
      }
      const action = actionButton.dataset.action;
      const id = actionButton.dataset.id;
      if (action === "edit") {
        openEditor(id);
      } else if (action === "favorite") {
        toggleFavorite(id);
      } else if (action === "delete") {
        openDeleteDialog(id);
      } else if (action === "copy") {
        copyKnowledge(id);
      } else if (action === "tag") {
        selectTag(actionButton.dataset.tag);
      }
    });

    dom.clearFiltersBtn.addEventListener("click", () => {
      resetFilters();
    });

    dom.importBtn.addEventListener("click", () => dom.importInput.click());
    dom.importInput.addEventListener("change", async () => {
      const file = dom.importInput.files && dom.importInput.files[0];
      dom.importInput.value = "";
      await importKnowledge(file);
    });
    dom.exportBtn.addEventListener("click", exportKnowledge);

    dom.retryLoadBtn.addEventListener("click", () => refreshKnowledge());

    dom.titleInput.addEventListener("input", clearTitleError);
    dom.contentInput.addEventListener("input", updateContentCount);
    dom.mnemonicInput.addEventListener("input", updateMnemonicCount);

    dom.knowledgeForm.addEventListener("submit", handleSubmit);

    dom.editorClose.addEventListener("click", () => closeEditor());
    dom.editorCancel.addEventListener("click", () => closeEditor());

    dom.editorDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeEditor();
    });

    dom.editorDialog.addEventListener("click", (event) => {
      if (event.target === dom.editorDialog) {
        closeEditor();
      }
    });

    dom.editorDialog.addEventListener("close", () => {
      ui.editingId = null;
    });

    dom.deleteCancel.addEventListener("click", () => {
      ui.pendingDeleteId = null;
      dom.deleteDialog.close();
    });

    dom.deleteConfirm.addEventListener("click", confirmDelete);

    dom.deleteDialog.addEventListener("click", (event) => {
      if (event.target === dom.deleteDialog) {
        ui.pendingDeleteId = null;
        dom.deleteDialog.close();
      }
    });

    dom.deleteDialog.addEventListener("close", () => {
      ui.pendingDeleteId = null;
    });

    dom.tablesCloseBtn.addEventListener("click", () => closeTablesDialog());
    dom.tablesBackBtn.addEventListener("click", () => backToTablesList());
    dom.tablesNewBtn.addEventListener("click", showNewTableForm);
    dom.emptyNewTableBtn.addEventListener("click", showNewTableForm);
    dom.createTableConfirm.addEventListener("click", createTableFromForm);
    dom.createTableCancel.addEventListener("click", () => {
      dom.tableCreatePanel.hidden = true;
    });
    dom.newTableTitle.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        createTableFromForm();
      } else if (event.key === "Escape") {
        dom.tableCreatePanel.hidden = true;
      }
    });

    dom.tablesListGrid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-table-id]");
      if (card) {
        openTableEditor(card.dataset.tableId);
      }
    });

    dom.tableTitleInput.addEventListener("input", () => {
      if (!ui.tableDraft) return;
      ui.tableDraft.title = dom.tableTitleInput.value;
      markTableDirty();
    });
    dom.tableDescInput.addEventListener("input", () => {
      if (!ui.tableDraft) return;
      ui.tableDraft.description = dom.tableDescInput.value;
      markTableDirty();
    });

    dom.tablesEditorView.addEventListener("input", (event) => {
      const target = event.target;
      if (!ui.tableDraft) return;
      if (target.classList.contains("table-col-input")) {
        const index = Number(target.dataset.col);
        ui.tableDraft.columns[index] = target.value;
        markTableDirty();
      } else if (target.classList.contains("table-cell-input")) {
        const row = Number(target.dataset.row);
        const column = Number(target.dataset.col);
        if (ui.tableDraft.rows[row]) {
          ui.tableDraft.rows[row][column] = target.value;
          target.style.height = "auto";
          target.style.height = `${Math.max(60, target.scrollHeight)}px`;
          markTableDirty();
        }
      }
    });

    dom.tablesEditorView.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-action]");
      if (actionButton) {
        if (actionButton.dataset.action === "delete-column") {
          deleteTableColumn(Number(actionButton.dataset.col));
        } else if (actionButton.dataset.action === "delete-row") {
          deleteTableRow(Number(actionButton.dataset.row));
        }
        return;
      }
      if (
        event.target === dom.tableBody ||
        event.target.closest(".table-empty-row")
      ) {
        addTableRow();
      }
    });

    dom.addRowBtn.addEventListener("click", addTableRow);
    dom.addColumnBtn.addEventListener("click", addTableColumn);
    dom.deleteTableBtn.addEventListener("click", deleteActiveTable);

    dom.tablesDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeTablesDialog();
    });
    dom.tablesDialog.addEventListener("click", (event) => {
      if (event.target === dom.tablesDialog) {
        closeTablesDialog();
      }
    });
    dom.tablesDialog.addEventListener("close", () => {
      showTablesList();
    });

    document.addEventListener("keydown", handleGlobalKeydown);
  }

  function handleGlobalKeydown(event) {
    const modifier = event.ctrlKey || event.metaKey;

    if (!dom.bootScreen.hidden || !dom.authScreen.hidden) {
      return;
    }

    if (event.key === "Escape" && dom.accountPopover && !dom.accountPopover.hidden) {
      event.preventDefault();
      closeAccountMenu();
      return;
    }

    if (dom.editorDialog.open && modifier && event.key === "Enter") {
      event.preventDefault();
      dom.knowledgeForm.requestSubmit();
      return;
    }

    if (anyDialogOpen()) {
      return;
    }

    if (modifier && event.key.toLocaleLowerCase() === "k") {
      event.preventDefault();
      dom.searchInput.focus();
      dom.searchInput.select();
      return;
    }

    if (event.key === "/" && !isTypingTarget(event.target)) {
      event.preventDefault();
      dom.searchInput.focus();
      dom.searchInput.select();
      return;
    }

    if (
      !modifier &&
      !event.altKey &&
      event.key.toLocaleLowerCase() === "n" &&
      !isTypingTarget(event.target)
    ) {
      event.preventDefault();
      openEditor();
      return;
    }

    if (event.key === "Escape" && document.activeElement === dom.searchInput) {
      if (state.query) {
        state.query = "";
        dom.searchInput.value = "";
        render();
      } else {
        dom.searchInput.blur();
      }
    }
  }
})();
