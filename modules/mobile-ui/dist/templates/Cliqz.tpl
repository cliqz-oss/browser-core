<!-- Cliqz.tpl -->

{{#with logo}}
	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}

<section class="primary">
    <div class="card__description">
       {{#with data}}
            <div class="cqz-result-h2 nopadding">
             <div class="EZ-Cliqz-Header"
                    data-style="background-image: url({{cliqz_logo}})">
                    <img url="https://twitter.com/cliqz" class="EZ-Cliqz_Header-Contact-icon" data-src="http://cdn.cliqz.com/extension/EZ/cliqz/EZ-social-twitter.svg" arrow-override="" arrow="true" style="text-decoration: none;">
                    <img url="https://www.facebook.com/cliqzde" class="EZ-Cliqz_Header-Contact-icon" data-src="http://cdn.cliqz.com/extension/EZ/cliqz/EZ-social-facebook.svg" arrow-override="">
             </div>

             {{#with slogan}}
                 <div style="">
                            <div class="EZ-Cliqz-Body-H1"> {{local 'cliqz_slogan_H1'}} </div>
                            <div class="EZ-Cliqz-Body-H2">{{local 'cliqz_slogan_H2'}}</div>
                 </div>
             {{/with}}

             <div class="EZ-Cliqz-Footer">
                <ul class="cta">
                    <li class="cqz-ez-btn"  url="{{Common_Questions.url}}">
                        <a>{{local 'cliqz_common_questions'}}</a>
                     </li>
                    <li class="cqz-ez-btn"  url="{{Give_Feedback.url}}">
                        <a>{{local 'cliqz_give_feedback'}}</a>
                     </li>
                    <li class="cqz-ez-btn" url="{{About_Us.url}}">
                        <a>{{local 'cliqz_about_us'}}</a>
                     </li>
                    <li class="cqz-ez-btn"  url="{{Jobs.url}}">
                        <a>{{local 'cliqz_jobs'}}</a>
                     </li>
                    <li class="cqz-ez-btn" url="{{Privacy.url}}">
                        <a>{{local 'cliqz_privacy'}}</a>
                    </li>
                    <li class="cqz-ez-btn"  url="{{Blog.url}}">
                        <a>{{local 'cliqz_blog'}}</a>
                    </li>
                </ul>
             </div>
            </div>
            {{/with}}
    </div>
</section>




