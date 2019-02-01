import React from 'react';
import t from '../../i18n';

function Header(props) {
  return (
    <div className="flex-container header">
      {props.data.labels
        && (
          <div className="special-flags">
            {props.data.labels.map(label =>
              (
                <span className={label}>{t(`app.offers.${label}`)}</span>
              ))
            }
          </div>
        )
      }
      <div
        className={`logo ${props.data.logo_class}`}
        style={{
          color: 'red',
          textIndent: '-1000em',
          backgroundImage: `url(${props.data.logo_dataurl})`,
        }}
      />
    </div>
  );
}

export default Header;
