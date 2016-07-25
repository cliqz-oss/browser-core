{{#with richData}}
{{#if (logic type_final '===' 'game')}}
<div>
    <div class="cqz-rd-info">{{local 'GameCategory'}}: {{game_cat}}</div>
    {{#if rating}}
       <img src="{{rating.img}}" class="cqz-rd-rateimg cqz-rd-snippet_hspacing" onerror="this.style.display='none';"/>
       <div class="cqz-rd-rate">{{localize_numbers rating.val}}/{{rating.scale}}</div>
    {{/if}}
    <div class="cqz-rd-max-lines4 cqz-rd-snippet_hspacing">{{des}}</div>
</div>
{{/if}}
{{#if (logic type_final '===' 'movie')}}
<div>
    {{#if (logic director '&&' director.title)}}
        <div class="cqz-rd-info">{{local director.title}}: <a href="{{director.info.url}}" class="cqz-rd-link" extra="director">{{director.info.name}}</a> </div>
    {{/if}}

    {{#if (is_not_dummy length)}}
    <div class="cqz-rd-info-2">{{local 'Movie_Length' length}}</div>
    {{/if}}

    {{#if rating}}
       <img src="{{rating.img}}" class="cqz-rd-rateimg cqz-rd-snippet_hspacing" onerror="this.style.display='none';"/>
       <div class="cqz-rd-rate">
           {{localize_numbers rating.val}}/{{rating.scale}}
           {{#if rating.nVote}} {{local 'from_lcase'}} {{localize_numbers rating.nVote}} {{local 'Votes'}}{{/if}}
       </div>
    {{/if}}
    <div class="cqz-rd-max-lines4 cqz-rd-snippet_hspacing">
        <p>{{des}}</p>
    </div>
</div>
{{/if}}
{{/with}}