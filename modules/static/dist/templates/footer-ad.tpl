<div class='cqz-result-box ad-container'
     id="ad-container"
     href="{{url}}">

  {{# if data.banner }}
      <p style="margin: 0;" class="offer-banner">
        <img src="{{data.banner}}" width="200" />
      </p>
  {{/if}}
  {{partial 'generic'}}

  {{# if data.btn_text }}
    <span  class="cqz-btn-offer">{{data.btn_text}}</span>
  {{/if}}

</div>
