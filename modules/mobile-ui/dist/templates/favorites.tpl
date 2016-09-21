<!-- conversations.tpl -->

<ul id="container" class="content favorites cf">
    {{#each data}}

        <li class="cf answer" data-ref="{{url}}" data-title="{{title}}"
             data-id="{{id}}" data-timestamp={{ timestamp }} data-index="{{@index}}">

            <div class="item">
                {{#with logo}}
                    {{#if backgroundImage}}
                        <div class="item__logo bg" style="background-image:{{backgroundImage}};
                                                          background-color:#{{backgroundColor}}"></div>
                    {{else}}
                        <div class="item__logo" style="{{ style }}">
                            {{ text }}
                        </div>
                    {{/if}}
                {{/with}}
                <div class="url"><div>{{domain}}</div></div>
                <div class="item__head">
                    {{title}}
                </div>
            </div>
        </li>

    {{/each}}

</ul>

{{#unless data}}
    <div class="nohistoryyet">
        <p>{{{local 'mobile_no_favorites'}}}</p>
    </div>
{{/unless}}

<!-- end conversations.tpl -->