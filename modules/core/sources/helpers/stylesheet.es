export function addStylesheet(document, url) {
  const stylesheet = document.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = url;
  stylesheet.type = 'text/css';
  stylesheet.style.display = 'none';
  stylesheet.classList.add('cliqz-theme');

  document.documentElement.appendChild(stylesheet);
}

export function removeStylesheet(document, url) {
  const styles = [].slice.call(document.getElementsByClassName('cliqz-theme'));
  styles.filter(style => style.href === url)
    .forEach(stylesheet => {
      if(!stylesheet.parentNode) {
        return;
      }

      stylesheet.parentNode.removeChild(stylesheet);
    });
}
