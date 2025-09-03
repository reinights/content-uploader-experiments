import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.bubble.css";
import "quill/dist/quill.snow.css";
import "./App.css";

import {
  $getRoot,
  $getSelection,
  $createParagraphNode,
  $createTextNode,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { HeadingNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, $createLinkNode } from "@lexical/link";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";

// ===========================
// LEXICAL CONFIGURATION
// ===========================

const initialConfig = {
  namespace: "LexicalEditor",
  nodes: [HeadingNode, ListNode, ListItemNode, LinkNode],
  theme: {
    paragraph: "lexical-paragraph",
    text: {
      bold: "lexical-bold",
      italic: "lexical-italic",
    },
    heading: {
      h1: "lexical-h1",
      h2: "lexical-h2",
      h3: "lexical-h3",
    },
    list: {
      nested: {
        listitem: "lexical-nested-listitem",
      },
      ol: "lexical-list-ol",
      ul: "lexical-list-ul",
      listitem: "lexical-listitem",
    },
    link: "lexical-link",
  },
  onError: (error: any) => console.error("Lexical error:", error),
};

// ===========================
// LEXICAL COMPONENTS
// ===========================

function HtmlOutputPlugin({ onChange }: { onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const htmlString = $generateHtmlFromNodes(editor, null);
        onChange(htmlString);
      });
    });
  }, [editor, onChange]);

  return null;
}

function LexicalToolbar({ onAIFormat }: { onAIFormat: () => void }) {
  const [editor] = useLexicalComposerContext();
  console.log(onAIFormat)
  const formatBold = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
  };

  const formatItalic = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (!url) return;
    const text = prompt("Enter link text:") || url;

    editor.update(() => {
      const selection = $getSelection();
      if (selection) {
        const linkNode = $createLinkNode(url);
        linkNode.append($createTextNode(text));
        selection.insertNodes([linkNode]);
      }
    });
  };

  const insertImage = () => {
    const url = prompt("Enter image URL:");
    if (!url) return;

    editor.update(() => {
      const selection = $getSelection();
      if (selection) {
        // Insert image as HTML string for now
        const paragraph = $createParagraphNode();
        paragraph.append(
          $createTextNode(
            `<img src="${url}" alt="Image" style="max-width: 100%; height: auto;" />`
          )
        );
        selection.insertNodes([paragraph]);
      }
    });
  };

  return (
    <div
      style={{
        borderBottom: "1px solid #ccc",
        marginBottom: "8px",
        padding: "8px",
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={formatBold}
        style={{
          padding: "4px 8px",
          fontWeight: "bold",
          background: "black",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        B
      </button>
      <button
        onClick={formatItalic}
        style={{
          padding: "4px 8px",
          fontStyle: "italic",
          background: "black",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        I
      </button>
      <button
        onClick={insertLink}
        style={{
          padding: "4px 8px",
          background: "black",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        Link
      </button>
      <button
        onClick={insertImage}
        style={{
          padding: "4px 8px",
          background: "black",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        Image
      </button>
    </div>
  );
}

function StoreLexicalEditor({
  editorRef,
}: {
  editorRef: React.MutableRefObject<any>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef]);

  return null;
}

// ===========================
// SHARED DATA
// ===========================

const SAMPLE_HTML = `
  <h2>Sample Lesson Title</h2>
  <p>This paragraph was <strong>AI-formatted</strong>. It includes a <a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>.</p>
  <ul>
    <li>Bullet one</li>
    <li>Bullet two</li>
  </ul>
  <p><img src="https://placehold.co/600x300" alt="Placeholder" /></p>
`;
// ===========================
// MAIN COMPONENT
// ===========================

export default function ThreeColumnEditor() {
  // Refs for editors
  const quillContainerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const lexicalEditorRef = useRef<any>(null);
  const selfRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // State for HTML content
  const [quillHtml, setQuillHtml] = useState<string>("");
  const [lexicalHtml, setLexicalHtml] = useState<string>("");
  const [selfHtml, setSelfHtml] = useState<string>("");

  // Toggle for self-coded editor
  const [selfEditable, setSelfEditable] = useState<boolean>(true);
  const selfEditingRef = useRef(false);

  // Hide toolbar if editing is disabled
  useEffect(() => {
    if (!selfEditable) {
      const toolbar = toolbarRef.current;
      if (toolbar) toolbar.style.opacity = "0";
    }
  }, [selfEditable]);

  // =======================================================================================================================================
  // QUILL
  // =======================================================================================================================================

  useEffect(() => {
    if (!quillContainerRef.current) return;

    quillRef.current = new Quill(quillContainerRef.current, {
      theme: "bubble",
      modules: {
        toolbar: {
          container: [
            ["bold", "italic", "underline", "link", "image", "imageUrl"],
          ],
          handlers: {
            imageUrl: function () {
              const urlRaw = prompt("Image URL (https://…):")?.trim();
              if (!urlRaw) return;
              const url = /^https?:\/\//i.test(urlRaw)
                ? urlRaw
                : `https://${urlRaw}`;
              const quill = quillRef.current!;
              const range = quill.getSelection(true) || {
                index: quill.getLength(),
                length: 0,
              };
              quill.insertEmbed(range.index, "image", url, "user");
              quill.setSelection(range.index + 1, 0, "silent");
            },
          },
        },
      },
      placeholder: "Enter your content in Quill…",
    });

    // Sync Quill changes
    quillRef.current.on("text-change", () => {
      if (quillRef.current) {
        const html = quillRef.current.root.innerHTML;
        setQuillHtml(html);
      }
    });
  }, []);

  const applyAIToQuill = (mode: "insert" | "replace" = "insert") => {
    const quill = quillRef.current;
    if (!quill) return;

    if (mode === "replace") {
      quill.setContents([]);
      quill.clipboard.dangerouslyPasteHTML(0, SAMPLE_HTML, "api");
    } else {
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.clipboard.dangerouslyPasteHTML(index, SAMPLE_HTML, "api");
    }

    const html = quill.root.innerHTML;
    setQuillHtml(html);
  };

  // ==================================================================================================================================================================
  // LEXICAL FUNCTIONS
  // ==================================================================================================================================================================

  const applyAIToLexical = (mode: "insert" | "replace" = "insert") => {
    if (!lexicalEditorRef.current) return;

    lexicalEditorRef.current.update(() => {
      // Clean HTML for better Lexical parsing
      const cleanHtml = SAMPLE_HTML.replace(/<img[^>]*>/g, (match) => {
        const src = match.match(/src="([^"]*)"/) || [];
        return `<p>[Image: ${src[1] || "No URL"}]</p>`;
      });

      const parser = new DOMParser();
      const dom = parser.parseFromString(cleanHtml, "text/html");
      const nodes = $generateNodesFromDOM(lexicalEditorRef.current, dom);

      if (mode === "replace") {
        const root = $getRoot();
        root.clear();
        root.append(...nodes);
      } else {
        const selection = $getSelection();
        if (selection) {
          selection.insertNodes(nodes);
        }
      }
    });
  };

  // ==================================================================================================================================================================
  // SELF-CODED FUNCTIONS
  // ==================================================================================================================================================================
  // Insert AI-formatted sample straight into the self-coded editor.
  // At the moment this just overwrites whatever's there.
  const applyAIToSelf = () => {
    if (!selfRef.current) return;
    selfRef.current.innerHTML = SAMPLE_HTML;
    setSelfHtml(SAMPLE_HTML);
    hideToolbar();
  };

  // Insert raw HTML into the editor at the given range.
  // Handy for dropping figures, links etc. directly into the DOM.
  const insertHtmlAtRange = (range: Range, html: string) => {
    const frag = range.createContextualFragment(html);
    range.deleteContents();
    range.insertNode(frag);
  };

  // Insert an image (with optional alt) into the editor.
  // Will go at the caret if it's inside, otherwise appends at the end.
  const insertImageSelf = () => {
    if (!selfEditable) return;
    const container = selfRef.current;
    if (!container) return;

    const urlRaw = prompt("Image URL (https://…):")?.trim();
    if (!urlRaw) return;
    const url = /^https?:\/\//i.test(urlRaw) ? urlRaw : `https://${urlRaw}`;

    const alt = (prompt("Alt text (optional):") || "").trim();

    const imgHtml = `<img src="${url}" ${
      alt ? `alt="${alt.replace(/"/g, "&quot;")}"` : ""
    } style="max-width:100%;height:auto;display:block;margin:0 0 8px 0;" />`;

    let range = getRangeInSelf();
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(container);
      range.collapse(false);
    }

    insertHtmlAtRange(range, imgHtml);
    commitSelfDom();

    // Caret shoved after whatever got added, keeps typing flowing
    const sel = window.getSelection();
    const after = document.createRange();
    after.setStartAfter(container.lastChild as Node);
    after.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(after);

    hideToolbar();
  };

  // Check if there’s a live selection inside our editor.
  // Returns the Range if valid, null if it’s outside or empty.
  const getRangeInSelf = (): Range | null => {
    const box = selfRef.current;
    if (!box) return null;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const r = sel.getRangeAt(0);
    const root =
      r.commonAncestorContainer instanceof Element
        ? r.commonAncestorContainer
        : r.commonAncestorContainer.parentElement;

    return root && box.contains(root) ? r : null;
  };

  // Wrap the current selection in a simple tag (<strong>/<em>).
  // Falls back gracefully if the DOM doesn’t like surroundContents.
  const wrapSelectionWith = (tagName: "strong" | "em") => {
    if (!selfRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = getRangeInSelf();
    if (!range) return;

    const wrapper = document.createElement(tagName);
    try {
      range.surroundContents(wrapper);
    } catch {
      const frag = range.extractContents();
      wrapper.appendChild(frag);
      range.insertNode(wrapper);
    }
    commitSelfDom();
    collapseAfterNode(wrapper);
  };

  // Apply a link to the selected text.
  // Prompts the user for a URL, wraps the selection in <a>.
  const applyLink = () => {
    if (!selfRef.current) return;
    const range = getRangeInSelf();
    if (!range) return alert("Select some text to link.");

    const urlRaw = prompt("Enter URL");
    if (!urlRaw) return;

    const url = urlRaw.startsWith("http") ? urlRaw : `https://${urlRaw}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    try {
      range.surroundContents(a);
    } catch {
      const frag = range.extractContents();
      a.appendChild(frag);
      range.insertNode(a);
    }
    commitSelfDom();
    collapseAfterNode(a);
  };

  // Strip a link if the caret’s inside one.
  // Unwraps the <a> and keeps the text in place.
  const removeLink = () => {
    if (!selfRef.current) return;
    const range = getRangeInSelf();
    if (!range) return;

    let node: Node | null = range.startContainer;
    while (
      node &&
      node !== selfRef.current &&
      (node as Element).nodeName?.toLowerCase() !== "a"
    ) {
      node = node.parentNode;
    }
    const a = node as HTMLAnchorElement | null;
    if (!a || a.nodeName.toLowerCase() !== "a") {
      alert("Place the caret inside a link to remove it.");
      return;
    }

    const parent = a.parentNode!;
    while (a.firstChild) parent.insertBefore(a.firstChild, a);
    parent.removeChild(a);
    commitSelfDom();
  };

  // Push the live innerHTML into React state.
  // Keeps the HTML Self panel in sync.
  const commitSelfDom = () => {
    if (!selfRef.current) return;
    setSelfHtml(selfRef.current.innerHTML);
  };

  // Move the caret just after a given node.
  // Handy after bold/italic/link actions so typing continues naturally.
  const collapseAfterNode = (el: Node) => {
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStartAfter(el);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);
    showToolbar();
  };

  // Work out where to stick the floating toolbar above the selection.
  // Figures out coords relative to the editor box and clamps so it stays inside.
  const positionToolbarOverRange = (
    toolbar: HTMLElement,
    container: HTMLElement,
    range: Range
  ) => {
    const rect = range.getBoundingClientRect();
    const parentRect = container.getBoundingClientRect();

    // If selection rect is empty (collapsed or hidden), skip
    if (!rect.width && !rect.height) return false;

    const toolbarWidth = toolbar.offsetWidth || 180; // fallback if hidden
    const toolbarHeight = toolbar.offsetHeight || 36;

    // Centre horizontally above selection
    let left = rect.left - parentRect.left + rect.width / 2 - toolbarWidth / 2;
    // Stick it 8px above the selection
    let top = rect.top - parentRect.top - toolbarHeight - 8;

    // Clamp inside the container so it doesn’t spill out
    left = Math.max(
      8,
      Math.min(left, container.clientWidth - toolbarWidth - 8)
    );
    top = Math.max(
      8,
      Math.min(top, container.clientHeight - toolbarHeight - 8)
    );

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
    return true;
  };

  // Show the floating toolbar if there’s a proper selection.
  // Positions it neatly above the highlighted text.
  const showToolbar = () => {
    const toolbar = toolbarRef.current;
    const container = selfRef.current;
    if (!toolbar || !container) return;

    if (!container.isContentEditable) return hideToolbar();

    const range = getRangeInSelf();
    const sel = window.getSelection();
    if (!range || !sel || sel.toString().trim().length === 0)
      return hideToolbar();

    const ok = positionToolbarOverRange(toolbar, container, range);
    if (ok) {
      toolbar.style.pointerEvents = "auto";
      toolbar.style.opacity = "1";
    } else {
      hideToolbar();
    }
  };

  // Hide the toolbar and stop it eating clicks.
  // Called when there’s no selection or focus is lost.
  const hideToolbar = () => {
    const toolbar = toolbarRef.current;
    if (toolbar) {
      toolbar.style.opacity = "0";
      toolbar.style.pointerEvents = "none";
    }
  };

  // Self-coded event handling
  useEffect(() => {
    const container = selfRef.current;
    if (!container) return;

    const handleMouseUp = () => showToolbar();
    const handleKeyUp = () => showToolbar();
    const handleScroll = () => showToolbar();
    const handleClickOutside = (e: MouseEvent) => {
      if (!toolbarRef.current) return;
      if (
        !container.contains(e.target as Node) &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        hideToolbar();
      }
    };

    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("keyup", handleKeyUp);
    container.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("keyup", handleKeyUp);
      container.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // =======================================================================================================================================
  // SHARED
  // =======================================================================================================================================
  const applyAIFormatting = (mode: "insert" | "replace" = "insert") => {
    applyAIToQuill(mode);
    applyAIToLexical(mode);
    applyAIToSelf();
  };
  useEffect(() => {
    if (!selfRef.current) return;
    if (selfEditingRef.current) return; // don’t clobber caret mid-typing
    selfRef.current.innerHTML = selfHtml || "";
  }, [selfHtml]);

  return (
    <div style={{ width: "100%", paddingTop: 16 }}>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginBottom: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button onClick={() => applyAIFormatting("insert")}>
          Apply AI Formatting (insert)
        </button>
        <button onClick={() => applyAIFormatting("replace")}>
          Apply AI Formatting (replace)
        </button>

        {/* NEW: Self-coded editable toggle */}
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={selfEditable}
            onChange={(e) => setSelfEditable(e.target.checked)}
          />
          Self-coded pane editable
        </label>
      </div>
      <b>Just a div with contentEditable - Pasting styles, Ctrl + Z,</b>
      <div
        style={{ width: "100%", height: "3vh", border: "1px solid black" }}
        contentEditable={true}
      ></div>
      {/* Three columns */}
      <br></br>
      <p>
        Notes: Quill and the Content Editable supports drag/drop. They use
        images in blobs, which could be difficult in uploading
      </p>
      <p>
        Lexical: toolbars are completely custom. The image button does not work,
        and I cannot make it
      </p>
      <div
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          alignItems: "stretch",
        }}
      >
        {/* QUILL EDITOR */}
        <div style={{ width: "500px" }}>
          <h4 style={{ margin: "0 0 8px 0", textAlign: "center" }}>Quill.js</h4>
          <div
            ref={quillContainerRef}
            style={{
              height: 400,
              border: "1px solid lightgray",
              borderRadius: 8,
              padding: 8,
            }}
          />
        </div>

        {/* LEXICAL EDITOR */}
        <div style={{ width: "500px" }}>
          <h4 style={{ margin: "0 0 8px 0", textAlign: "center" }}>Lexical</h4>
          <div
            style={{
              height: 400,
              border: "1px solid lightgray",
              borderRadius: 8,
              padding: 8,
              background: "white",
            }}
          >
            <LexicalComposer initialConfig={initialConfig}>
              <StoreLexicalEditor editorRef={lexicalEditorRef} />
              <LexicalToolbar onAIFormat={() => applyAIToLexical("replace")} />
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    style={{
                      minHeight: "300px",
                      outline: "none",
                      padding: "8px",
                      lineHeight: "1.6",
                    }}
                  />
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <AutoFocusPlugin />
              <ListPlugin />
              <LinkPlugin />
              <HtmlOutputPlugin onChange={setLexicalHtml} />
            </LexicalComposer>
          </div>
        </div>

        {/* SELF-CODED EDITOR */}
        <div style={{ position: "relative", width: "500px" }}>
          <h4 style={{ margin: "0 0 8px 0", textAlign: "center" }}>
            Self-coded [Content Editable] {selfEditable ? "" : "(locked)"}
          </h4>
          <div
            style={{
              height: 400,
              border: "1px solid lightgray",
              borderRadius: 8,
              padding: 16,
              overflowY: "auto",
              overflowX: "hidden",
              background: selfEditable ? "#fafafa" : "#f3f3f3",
              position: "relative",
              wordWrap: "break-word",
              // slight visual cue when locked
              filter: selfEditable ? "none" : "grayscale(0.15)",
            }}
          >
            {/* Floating toolbar */}
            <div
              ref={toolbarRef}
              style={{
                position: "absolute",
                background: "#222",
                color: "#fff",
                borderRadius: 6,
                padding: "6px 8px",
                display: "flex",
                gap: 8,
                boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
                opacity: 0,
                transition: "opacity 120ms ease",
                zIndex: 3,
                pointerEvents: "none",
              }}
              onMouseDown={(e) => {
                if (!selfEditable) return;
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                if (!selfEditable) return;
                e.stopPropagation();
              }}
            >
              <button
                onClick={() => selfEditable && wrapSelectionWith("strong")}
                disabled={!selfEditable}
                style={{
                  background: "transparent",
                  border: "1px solid #555",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  cursor: selfEditable ? "pointer" : "not-allowed",
                  opacity: selfEditable ? 1 : 0.5,
                }}
              >
                B
              </button>
              <button
                onClick={() => selfEditable && wrapSelectionWith("em")}
                disabled={!selfEditable}
                style={{
                  background: "transparent",
                  border: "1px solid #555",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontStyle: "italic",
                  cursor: selfEditable ? "pointer" : "not-allowed",
                  opacity: selfEditable ? 1 : 0.5,
                }}
              >
                I
              </button>
              <button
                onClick={() => selfEditable && applyLink()}
                disabled={!selfEditable}
                style={{
                  background: "transparent",
                  border: "1px solid #555",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: selfEditable ? "pointer" : "not-allowed",
                  opacity: selfEditable ? 1 : 0.5,
                }}
              >
                Link
              </button>
              <button
                onClick={() => selfEditable && removeLink()}
                disabled={!selfEditable}
                style={{
                  background: "transparent",
                  border: "1px solid #555",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: selfEditable ? "pointer" : "not-allowed",
                  opacity: selfEditable ? 1 : 0.5,
                }}
              >
                Unlink
              </button>

              <button
                onClick={() => selfEditable && insertImageSelf()}
                disabled={!selfEditable}
                style={{
                  background: "transparent",
                  border: "1px solid #555",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: selfEditable ? "pointer" : "not-allowed",
                  opacity: selfEditable ? 1 : 0.5,
                }}
              >
                Image
              </button>
            </div>

            {/* Content */}
            <div
              ref={selfRef}
              contentEditable={selfEditable}
              suppressContentEditableWarning
              style={{
                outline: "none",
                lineHeight: 1.6,
                cursor: "text",
                textAlign: "left",
                userSelect: "text",
              }}
              onBeforeInput={() => {
                if (selfEditable) selfEditingRef.current = true;
              }}
              onInput={() => {
                if (!selfEditable) return;
                // Read DOM -> state (don’t write DOM here!)
                commitSelfDom();
              }}
              onBlur={() => {
                // User stopped editing; allow DOM sync again
                selfEditingRef.current = false;
                commitSelfDom();
              }}
            />
          </div>
        </div>
      </div>

      {/* HTML Code Output */}
      <div style={{ marginTop: 20, fontSize: "12px", color: "#666" }}>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <div style={{ width: "500px" }}>
            <strong>Quill HTML:</strong>
            <pre
              style={{
                background: "#f5f5f5",
                padding: "8px",
                borderRadius: "4px",
                marginTop: "4px",
                minHeight: "100px",
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #ddd",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "11px",
              }}
            >
              {quillHtml || "(empty)"}
            </pre>
          </div>

          <div style={{ width: "500px" }}>
            <strong>Lexical HTML:</strong>
            <pre
              style={{
                background: "#f5f5f5",
                padding: "8px",
                borderRadius: "4px",
                marginTop: "4px",
                minHeight: "100px",
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #ddd",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "11px",
              }}
            >
              {lexicalHtml || "(empty)"}
            </pre>
          </div>

          <div style={{ width: "500px" }}>
            <strong>Self-coded HTML:</strong>
            <pre
              style={{
                background: "#f5f5f5",
                padding: "8px",
                borderRadius: "4px",
                marginTop: "4px",
                minHeight: "100px",
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #ddd",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "11px",
              }}
            >
              {selfHtml || "(empty)"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
