<div class='cliqz-inline-box-children cliqz-result-generic'>
  <div class='cliqz-result-left-box'>
    <div class='cliqz-result-type' ></div>
  </div>
  {{#if image.src}}
    <div class="cliqz-image" style="
          background-image: url({{ image.src }});
          background-size: contain;
          width: 64px;
          height: 64px;
          background-repeat: no-repeat;
          background-position: center center;
          border: 1px solid #efefef;
          background-color: white;"
    >
    </div>
  {{/if}}
  <div class='cliqz-result-mid-box'
    style='width:{{ width }}px;'>
    <div class='cliqz-result-title-box overflow'
         style='padding-bottom: 0px;' extra="title">
      {{ title }}
    </div>
    <div class='cliqz-result-url-box overflow'>
      <span class='cliqz-result-url-host
        {{#if urlDetails.ssl }}
          cliqz-result-url-ssl
        {{/if}}
        '
        extra="url"
      >
        {{ urlDetails.friendly_url }}
      </span>
    </div>
    <div>
      <span class='cliqz-shopping-result-price'>
        {{ data.richData.price_currency }} {{ data.richData.price }}
      </span>
    </div>
    <div style='padding-top: 2px;'>
      <span class="cliqz-shopping-result-stars-box">
        <span class="cliqz-shopping-result-stars" style="
          width: {{ shopping_stars_width data.richData.rating }}px;
        ">
      </span>
      </span>
      <span class="cliqz-shopping-result-reviews">
        ({{ data.richData.reviews }})
      </span>
    </div>
    <div class='cliqz-result-description'>
      {{ data.description }}
    </div>

  </div>
  <div class='cliqz-result-right-box cliqz-logo {{ logo }}'
       newtab='true'>
  </div>
</div>
