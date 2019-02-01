function getNodes(node, list) {
  const { url, title, dateAdded, children } = node;
  if (url && url.startsWith('http')) {
    list.push({ url, title, lastModified: dateAdded });
  }
  if (children) {
    for (const child of children) {
      getNodes(child, list);
    }
  }
}

export default async function () {
  const list = [];
  getNodes({ children: await browser.bookmarks.getTree() }, list);
  return list;
}
