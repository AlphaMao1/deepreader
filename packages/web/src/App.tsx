import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  ChevronDown,
  Circle,
  FileText,
  Highlighter,
  Home,
  Library,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  NotebookText,
  PanelLeft,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Tags,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "图书馆", icon: Library },
  { to: "/reader", label: "阅读", icon: BookOpen },
  { to: "/settings", label: "设置", icon: Settings },
];

const tags = [
  { name: "全部", count: 12, color: "#6b7280" },
  { name: "未分类", count: 11, color: "#9ca3af" },
  { name: "决策科学", count: 1, color: "#2563eb" },
  { name: "心理学", count: 1, color: "#7c6f45" },
  { name: "思维方式", count: 1, color: "#c7c7c7" },
];

const books = [
  { title: "思考，快与慢", author: "丹尼尔·卡尼曼", progress: "4%", tone: "ink" },
  { title: "今日简史：人类命运大议题", author: "尤瓦尔·赫拉利", progress: "New", tone: "green" },
  { title: "梦的解析", author: "西格蒙德·弗洛伊德", progress: "New", tone: "blue" },
  { title: "债务危机", author: "Ray Dalio", progress: "New", tone: "red" },
  { title: "主权个人", author: "James Dale Davidson", progress: "New", tone: "orange" },
  { title: "通往奴役之路", author: "哈耶克", progress: "New", tone: "lime" },
  { title: "物种起源", author: "查尔斯·达尔文", progress: "New", tone: "sand" },
  { title: "贫穷的本质", author: "Abhijit V. Banerjee", progress: "New", tone: "paper" },
  { title: "枪炮、病菌与钢铁", author: "贾雷德·戴蒙德", progress: "New", tone: "amber" },
  { title: "人类简史：从动物到上帝", author: "尤瓦尔·赫拉利", progress: "0%", tone: "gray" },
];

const tocItems = [
  { title: "推荐序", page: 1, active: true },
  { title: "第一部分 认知革命", page: 21 },
  { title: "第一章 人类：一种也没什么特别的动物", page: 23 },
  { title: "第二章 知善恶树", page: 39 },
  { title: "第三章 亚当和夏娃的一天", page: 61 },
  { title: "第四章 毁天灭地的人类洪水", page: 87 },
];

const notes = [
  "农业革命可能是史上最大的一桩骗局。",
  "虚构故事让大量陌生人能够协作。",
  "历史不是为了给人确定答案，而是打开更多可能性。",
];

const chatMessages = [
  {
    role: "assistant",
    content: "这段的核心不是评价农业革命好坏，而是提醒你：一个让群体扩张的制度，未必让个体生活更轻松。",
  },
  {
    role: "user",
    content: "把这个观点和作者前面说的“虚构秩序”连起来。",
  },
  {
    role: "assistant",
    content:
      "可以这样连：虚构秩序降低大规模协作成本，农业社会则把这种协作固定到土地、税收和等级里。效率提高了，自由度反而下降。",
  },
];

function App() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isReader = location.pathname === "/reader";

  return (
    <div className="app-root">
      <TopTabs
        isReader={isReader}
        mobileNavOpen={mobileNavOpen}
        onToggleNav={() => setMobileNavOpen((open) => !open)}
      />

      {isReader ? (
        <Routes>
          <Route element={<ReaderView />} path="/reader" />
          <Route
            element={<LibraryShell mobileNavOpen={mobileNavOpen} onCloseNav={() => setMobileNavOpen(false)} />}
            path="*"
          />
        </Routes>
      ) : (
        <div className="home-layout">
          <Sidebar mobileNavOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
          <Routes>
            <Route element={<LibraryView />} path="/" />
            <Route element={<SettingsView />} path="/settings" />
          </Routes>
        </div>
      )}
    </div>
  );
}

function LibraryShell({ mobileNavOpen, onCloseNav }: { mobileNavOpen: boolean; onCloseNav: () => void }) {
  return (
    <div className="home-layout">
      <Sidebar mobileNavOpen={mobileNavOpen} onClose={onCloseNav} />
      <LibraryView />
    </div>
  );
}

function TopTabs({
  isReader,
  mobileNavOpen,
  onToggleNav,
}: {
  isReader: boolean;
  mobileNavOpen: boolean;
  onToggleNav: () => void;
}) {
  return (
    <header className="top-tabs">
      <div className="window-dots" aria-hidden="true">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
      </div>

      <button
        aria-label={mobileNavOpen ? "关闭导航" : "打开导航"}
        className="icon-button menu-button"
        onClick={onToggleNav}
        type="button"
      >
        {mobileNavOpen ? <X size={17} /> : <Menu size={17} />}
      </button>

      <NavLink aria-label="回到图书馆" className="home-tab" to="/">
        <Home size={18} />
      </NavLink>

      {isReader && (
        <div className="book-tab">
          <span>人类简史：从动物到上帝</span>
          <X size={14} />
        </div>
      )}

      <div className="top-spacer" />
      <button aria-label="通知" className="icon-button" type="button">
        <Bell size={18} />
      </button>
    </header>
  );
}

function Sidebar({ mobileNavOpen, onClose }: { mobileNavOpen: boolean; onClose: () => void }) {
  return (
    <aside className="sidebar" data-open={mobileNavOpen}>
      <label className="search-box">
        <Search aria-hidden="true" size={17} />
        <input aria-label="搜索书籍" placeholder="搜索" />
      </label>

      <nav className="nav-list" aria-label="主要导航">
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            key={item.to}
            onClick={onClose}
            to={item.to}
          >
            <item.icon aria-hidden="true" size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-section">
        <div className="section-row">
          <span>标签</span>
          <Plus aria-hidden="true" size={16} />
        </div>
        <div className="tag-list">
          {tags.map((tag) => (
            <button className="tag-row" key={tag.name} type="button">
              <Circle aria-hidden="true" fill={tag.color} size={10} strokeWidth={0} />
              <span>{tag.name}</span>
              <em>{tag.count}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-links">
        <SideAction icon={MessageSquareText} label="聊天" />
        <SideAction icon={Brain} label="记忆" />
        <SideAction icon={Sparkles} label="技能库" />
        <SideAction icon={BarChart3} label="阅读统计" />
      </div>
    </aside>
  );
}

function SideAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button className="side-action" type="button">
      <Icon aria-hidden="true" size={18} />
      <span>{label}</span>
    </button>
  );
}

function LibraryView() {
  return (
    <main className="library-panel">
      <div className="library-header">
        <h1>我的图书</h1>
        <button className="primary-button" type="button">
          <Plus aria-hidden="true" size={18} />
          添加书籍
        </button>
      </div>

      <div className="book-grid" aria-label="图书列表">
        {books.map((book, index) => (
          <NavLink className="book-card" key={book.title} to={index === books.length - 1 ? "/reader" : "/reader"}>
            <div className={`book-cover ${book.tone}`}>
              <strong>{book.title}</strong>
              <span>{book.author}</span>
            </div>
            <div className="book-card-footer">
              <div className="progress-chip">{book.progress}</div>
              <div className="book-actions">
                <Circle aria-hidden="true" size={18} />
                <MoreHorizontal aria-hidden="true" size={18} />
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    </main>
  );
}

function ReaderView() {
  return (
    <main className="reader-workbench">
      <aside className="toc-panel" aria-label="目录和笔记">
        <div className="panel-heading">
          <PanelLeft aria-hidden="true" size={18} />
          <strong>目录</strong>
        </div>
        <div className="toc-search">
          <Search aria-hidden="true" size={16} />
          <input aria-label="搜索目录" placeholder="搜索章节或笔记" />
        </div>
        <div className="toc-list">
          {tocItems.map((item) => (
            <button className={`toc-item${item.active ? " active" : ""}`} key={item.title} type="button">
              <span>{item.title}</span>
              <em>{item.page}</em>
            </button>
          ))}
        </div>

        <div className="note-stack">
          <div className="panel-heading compact">
            <NotebookText aria-hidden="true" size={17} />
            <strong>本章摘记</strong>
          </div>
          {notes.map((note) => (
            <button className="note-card" key={note} type="button">
              {note}
            </button>
          ))}
        </div>
      </aside>

      <article className="reading-pane" aria-labelledby="reader-title">
        <div className="reader-toolbar">
          <div>
            <p>推荐序</p>
            <h1 id="reader-title">人类简史：从动物到上帝</h1>
          </div>
          <div className="reader-tools">
            <button type="button">
              <Search aria-hidden="true" size={17} />
              搜索
            </button>
            <button type="button">
              <Tags aria-hidden="true" size={17} />
              标注
            </button>
          </div>
        </div>

        <div className="book-page">
          <p>
            子结合那么多“硬科学”，用不到 500 页的篇幅写出的从石器时代智人演化直到 21
            世纪政治和技术革命的一整部“人类史”，在“专业历史学家”看来，恐怕已经很难说还是通常意义上的“历史”了。
          </p>
          <p>
            可是，如果不是历史，它又能是什么呢？在我看来，写历史写到这个份儿上，一般都只有一个结果，那就是离开了“历史”而走向了“哲学”。
          </p>
          <p>
            读《人类简史》，我们每每会为作者非同寻常的想象力而赞叹。比如，他竟能从生物学制造的那只背上长耳朵的老鼠，联想到
            3.2 万年前的施泰德“狮人”。
          </p>
          <p className="selected-passage">
            <span>农业革命可能是史上最大的一桩骗局。</span>
            它让农民过着比采集者更辛苦的生活，只是造成了人口爆炸。
          </p>

          <div className="selection-actions" aria-label="选中文本操作">
            <button type="button">
              <Highlighter aria-hidden="true" size={16} />
              高亮
            </button>
            <button type="button">
              <FileText aria-hidden="true" size={16} />
              笔记
            </button>
            <button type="button">
              <MessageSquareText aria-hidden="true" size={16} />问 AI
            </button>
          </div>
          <p>
            这类判断有意思的地方在于，它不满足于复述事件，而是追问：一个制度让整体规模变大之后，个体是否真的变得更自由、更幸福？
          </p>
        </div>

        <footer className="page-footer">第 3 / 551 页</footer>
      </article>

      <aside className="ai-panel" aria-label="AI 阅读助手">
        <div className="ai-toolbar">
          <button className="model-button" type="button">
            deepseek-chat
            <ChevronDown aria-hidden="true" size={16} />
          </button>
          <div className="ai-icons">
            <button aria-label="新对话" type="button">
              <Plus size={17} />
            </button>
            <button aria-label="设置" type="button">
              <Settings size={17} />
            </button>
          </div>
        </div>

        <div className="chat-scroll">
          {chatMessages.map((message) => (
            <div className={`chat-message ${message.role}`} key={message.content}>
              {message.content}
            </div>
          ))}
        </div>

        <div className="quick-prompts" aria-label="快捷提问">
          <button type="button">
            <BookOpen aria-hidden="true" size={16} />
            总结本章
          </button>
          <button type="button">
            <Brain aria-hidden="true" size={16} />
            分析观点
          </button>
          <button type="button">
            <NotebookText aria-hidden="true" size={16} />
            生成笔记
          </button>
        </div>

        <div className="chat-input">
          <textarea aria-label="向 AI 提问" placeholder="问我任何问题..." />
          <button aria-label="发送" type="button">
            <Send size={18} />
          </button>
        </div>
      </aside>
    </main>
  );
}

function SettingsView() {
  return (
    <main className="settings-panel">
      <div className="library-header">
        <h1>设置</h1>
      </div>
      <div className="settings-grid">
        <SettingBlock
          title="同步账号"
          description="使用邮箱登录后，同一本 EPUB、进度、标注和对话可以在电脑与 Android PWA 间同步。"
        />
        <SettingBlock title="AI 模型" description="聊天模型和向量模型的 API Key 保存在当前浏览器，不上传到云端。" />
        <SettingBlock title="离线阅读" description="已缓存的 EPUB 可以离线打开；AI、远程检索和跨端同步需要联网。" />
        <SettingBlock
          title="Markdown 导出"
          description="标注、摘录和记忆可以导出为 Markdown，再交给 Codex 或 Obsidian 归档。"
        />
      </div>
    </main>
  );
}

function SettingBlock({ title, description }: { title: string; description: string }) {
  return (
    <section className="setting-block">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export default App;
