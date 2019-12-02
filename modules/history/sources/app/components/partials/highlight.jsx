import React from 'react';
import PropTypes from 'prop-types';

const generateHighlights = (text, em) => {
  if (!em || !text) {
    return [text];
  }

  const tokens = [];

  const textCopy = text.toLowerCase();
  const emCopy = em.toLowerCase();
  const textCopyLength = textCopy.length;

  let i = 0;
  let match = textCopy.indexOf(emCopy, i);

  while (match !== -1) {
    const start = match;
    const end = match + emCopy.length;

    if (start > i) {
      tokens.push(text.slice(i, start));
    }
    tokens.push(<b key={end}>{text.slice(start, end)}</b>);

    i = end;
    match = textCopy.indexOf(emCopy, i);
  }

  if (i < textCopyLength) {
    tokens.push(text.slice(i, textCopyLength));
  }

  return tokens;
};

const Hightlight = ({ text, em }) => (
  <span>
    {generateHighlights(text, em)}
  </span>
);

Hightlight.propTypes = {
  text: PropTypes.string.isRequired,
  em: PropTypes.string.isRequired,
};

export default Hightlight;
