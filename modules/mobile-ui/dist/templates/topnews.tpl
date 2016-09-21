<!-- topnews.tpl -->

{{#if this}}
  <div class="main">
    <ul>
        {{#each this}}

            <li class="cf answer" onclick="osAPI.openLink('{{url}}')">

                <div class="item">
                    {{#if backgroundImage}}
                        <div class="item__logo bg" style="background-image:{{backgroundImage}};
                                                          background-color:#{{backgroundColor}}"></div>
                    {{else}}
                        <div class="item__logo" style="{{ style }}">
                            {{ text }}
                        </div>
                    {{/if}}
                    <div class="url"><div>{{displayUrl}}</div></div>
                    <h1 class="item__head" data-index="{{@index}}">
                        {{ short_title }}
                    </h1>
                </div>
            </li>

        {{/each}}
    </ul>
  </div>
{{/if}}
<!-- end topnews.tpl -->
