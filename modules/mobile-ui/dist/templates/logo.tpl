<!-- logo.tpl -->
{{#with logo}}
<div newtab='true' class="meta__logo {{#if backgroundImage}}image{{/if}}"
                style="{{#if backgroundImage}}
                      	background-image:{{backgroundImage}};
                     	{{#if backgroundColor}} background-image:{{backgroundColor}};{{/if}}
               			{{else}}
                      		{{ style }};
						{{/if}}
               ">
       {{ text }}</div>
 {{/with}}
 <!-- end logo.tpl -->