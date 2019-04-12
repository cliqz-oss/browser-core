export function addStylesheet(document, url, className = 'cliqz-theme') {
  const stylesheet = document.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = url;
  stylesheet.type = 'text/css';
  stylesheet.style.display = 'none';
  stylesheet.classList.add(className);
  document.documentElement.appendChild(stylesheet);
}

export function removeStylesheet(document, url, className = 'cliqz-theme') {
  const styles = [].slice.call(document.getElementsByClassName(className));
  styles.filter(style => style.href === url)
    .forEach((stylesheet) => {
      if (!stylesheet.parentNode) {
        return;
      }

      stylesheet.parentNode.removeChild(stylesheet);
    });
}
