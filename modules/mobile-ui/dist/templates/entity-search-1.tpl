<!-- entity-search-1.tpl -->
{{#with logo}}
	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}

<section class="primary">

    <h1 class="card__title">
       <div>{{data.search_provider}}</div>
    </h1>

    <div class="card__meta">
        <div>{{data.friendly_url}}</div>
    </div>

    <div class="card__description">
        
      <div
        {{#if data.urls}}
          class="cqz-result-h1 cqz-result-padding"
        {{else}}
          class="cqz-result-h2 cqz-result-padding"
        {{/if}}
      >
        <div class="cqz-ez-search-app-box">
          <ul class="cta-list">
          {{#each data.links}}
            <li
              class="cqz-ez-search-app transition"
              style="background-color: {{this.background_color_icon}};"
              url="{{this.url}}"
              extra="link-{{this.logg_as}}"
              ><span class="cta__logo image" data-style="background-image: url({{this.icon_url}})">Icon</span>
                  <a>{{this.text}}</a>
            </li>
          {{/each}}
        </ul>
        </div>
        {{>EZ-history}}
      </div>

        
    </div>

</section>






<!-- end entity-search-1.tpl -->