import coreMd5 from '../core/helpers/md5'

const md5 = typeof crypto !== 'undefined' && crypto.md5 ? crypto.md5 : coreMd5;

export default function(s) {
    if (!s) return "";
    return md5(s);
}
