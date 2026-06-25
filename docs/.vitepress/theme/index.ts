import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import './custom.css'
import ExampleViewer from './components/ExampleViewer.vue'
import NavBrandVersion from './components/NavBrandVersion.vue'

function updateRowVisibilities(tbody: HTMLElement) {
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  const expansionStates = new Map<string, boolean>();
  rows.forEach((row) => {
    const label = row.querySelector('.vp-api-toggle-label');
    if (label) {
      const path = label.getAttribute('data-row-path');
      if (path) {
        expansionStates.set(path, label.getAttribute('aria-expanded') !== 'false');
      }
    }
  });

  rows.forEach((row) => {
    const parentPath = row.getAttribute('data-parent-path');
    if (!parentPath) {
      row.style.setProperty('display', 'table-row', 'important');
      return;
    }

    const pathParts = parentPath.split('.');
    let anyAncestorCollapsed = false;
    
    for (let len = 1; len <= pathParts.length; len++) {
      const ancestorPath = pathParts.slice(0, len).join('.');
      if (expansionStates.has(ancestorPath) && expansionStates.get(ancestorPath) === false) {
        anyAncestorCollapsed = true;
        break;
      }
    }

    if (anyAncestorCollapsed) {
      row.style.setProperty('display', 'none', 'important');
    } else {
      row.style.setProperty('display', 'table-row', 'important');
    }
  });
}

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-title-after': () => h(NavBrandVersion),
    })
  },
  enhanceApp({ app }) {
    app.component('ExampleViewer', ExampleViewer)

    if (typeof window !== 'undefined') {
      window.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const label = target.closest('.vp-api-toggle-label');
        if (label) {
          const isExpanded = label.getAttribute('aria-expanded') === 'true';
          label.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
          
          const tbody = label.closest('tbody');
          if (tbody) {
            updateRowVisibilities(tbody as HTMLElement);
          }
        }
      });

      // Initialize visibility state on element rendering and hydration
      const observer = new MutationObserver(() => {
        document.querySelectorAll('.vp-api-table-wrapper tbody').forEach((tbody) => {
          updateRowVisibilities(tbody as HTMLElement);
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
}
