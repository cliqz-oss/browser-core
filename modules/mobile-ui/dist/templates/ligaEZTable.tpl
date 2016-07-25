<!-- ligaEZTable.tpl -->
   
{{#with logo}}
	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}

{{#with data}}

    <section class="primary">
        <h1 class="card__title">
           <a href="{{../url}}">{{leagueName}}</a>
        </h1>
    </section>

    <section class="secondary">
        <div class="card__description">
            
            <div class="ez-liga-tableHeader">
              <table>
                <thead>
                     <th></th>
                     <th>Mannschaft</th>
                     <th class="small">SP</th> 
                     <th class="small">TD</th> 
                     <th class="small bold">PKT</th> 
                </thead> 

                <tbody> 
                    {{#ranking}} 
                    <tr> 
                        <td>{{rank}}.</td>
                        <td>{{club}}</td>
                        <td class="small">{{SP}}</td> 
                        <td class="small">{{TD}}</td> 
                        <td class="small bold">{{PKT}}</td> 
                    </tr> 
                    {{/ranking}} 
                </tbody> 
              </table> 
            </div>


            <div class="poweredby" url="{{url}}">{{local 'GoToTable'}}</div>

            <div class="poweredby">
            <a href="http://www.kicker.de">{{local 'KickerSponsor'}}</a>
            </div>


        </div>
    </section>
{{/with}}


<!-- end ligaEZTable.tpl -->