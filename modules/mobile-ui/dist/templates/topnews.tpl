<!-- topnews.tpl -->

{{#if this}}
  <div class="main">
    <ul>
        {{#each this}}
            <li class="item" onclick="osAPI.openLink('{{url}}')">
                <div class="meta__logo transition"
                 style="{{style}}"
                 show-status=""
                 extra="{{extra}}"
                 url="{{url}}"
                 >{{ text }}
                </div>
                <h1 class="main__headline">
                    <a class="topNewsLink" data-index="{{@index}}">
                        {{ short_title }}
                    </a>
                </h1>
                <div class="meta">
                  {{displayUrl}}
                </div>
            </li>
        {{/each}}
    </ul>
  </div>
{{/if}}
<!-- end topnews.tpl -->
