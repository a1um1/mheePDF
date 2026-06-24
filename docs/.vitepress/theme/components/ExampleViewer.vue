<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{
  active: string
}>()

const current = computed(() => props.active)

const pdfUrl = computed(() => {
  return withBase(`/examples/${props.active}.pdf`)
})
</script>

<template>
  <div class="example-viewer">
    <!-- Main Workspace Layout (Code + PDF Preview) -->
    <div class="workspace">
      <!-- Code Section (Left Pane) -->
      <div class="pane code-pane">
        <div class="pane-header">
          <span class="pane-title">Source Code ({{ active }}.ts)</span>
        </div>
        <div class="pane-body code-content">
          <div class="slot-container">
            <slot name="code" />
          </div>
        </div>
      </div>

      <!-- Preview Section (Right Pane) -->
      <div class="pane preview-pane">
        <div class="pane-header preview-header">
          <span class="pane-title">PDF Preview</span>
          <div class="header-actions">
            <a 
              :href="pdfUrl" 
              target="_blank" 
              class="action-btn outline-btn"
              title="Open in a new browser tab"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
              </svg>
              Open Tab
            </a>
            <a 
              :href="pdfUrl" 
              download
              class="action-btn primary-btn"
              title="Download PDF file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              Download
            </a>
          </div>
        </div>
        <div class="pane-body preview-content">
          <iframe 
            :src="pdfUrl" 
            class="pdf-iframe" 
            title="PDF Preview Frame"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.example-viewer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.5rem;
  width: 100%;
}

/* Workspace Layout */
.workspace {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  min-height: 620px;
  height: calc(100vh - 280px);
  width: 100%;
}

@media (max-width: 960px) {
  .workspace {
    grid-template-columns: 1fr;
    height: auto;
    min-height: auto;
  }
  .pdf-iframe {
    height: 500px !important;
  }
}

/* Pane Styling */
.pane {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.pane-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pane-body {
  flex: 1;
  overflow: auto;
  position: relative;
}

/* Make code pane look like a native VitePress code block */
.code-pane {
  background-color: var(--vp-code-block-bg) !important;
  border-color: var(--vp-code-block-bg) !important;
}

.code-pane .pane-header {
  background-color: var(--vp-code-block-bg) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.code-pane .pane-title {
  color: rgba(255, 255, 255, 0.6) !important;
}

/* Code block custom styles to fit container */
.code-content :deep(div[class*="language-"]) {
  margin: 0 !important;
  border-radius: 0 !important;
  height: 100%;
}

.code-content :deep(pre) {
  margin: 0 !important;
  height: 100% !important;
  border-radius: 0 !important;
  background-color: transparent !important;
}

.slot-container {
  height: 100%;
}

/* Preview Actions */
.preview-header {
  height: 49px; /* Match standard code header height */
  box-sizing: border-box;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  text-decoration: none !important;
  transition: all 0.2s ease;
}

.icon {
  width: 14px;
  height: 14px;
}

.outline-btn {
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1) !important;
}

.outline-btn:hover {
  background-color: var(--vp-c-bg-soft);
  border-color: var(--vp-c-text-2);
}

.primary-btn {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-bg) !important;
}

.primary-btn:hover {
  background-color: var(--vp-c-brand-2);
}

.dark .primary-btn {
  color: #1e1e20 !important; /* Dark mode contrasting text */
}

/* PDF Preview Frame */
.preview-content {
  background-color: #525659; /* Standard PDF viewer background */
}

.pdf-iframe {
  border: none;
  width: 100%;
  height: 100%;
  display: block;
  background-color: #525659;
}
</style>
