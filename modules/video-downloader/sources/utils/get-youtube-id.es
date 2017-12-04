// From https://stackoverflow.com/questions/2964678/jquery-youtube-url-validation-with-regex
const regex = /^(?:https?:\/\/)?(?:(?:www|m)\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;

export default function (url) {
  const match = url && url.match(regex);
  if (match) {
    return match[1];
  }
  return null;
}
