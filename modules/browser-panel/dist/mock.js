function renderData(mockData) {
    iframeHolder.innerHTML = '';
    mockData.forEach(function (offer, index) {
        $dynamicIframeElm = document.createElement("iframe");
        var iframeElmId = "cqz-offer-counter-" + index;
        $dynamicIframeElm.id = iframeElmId;
        $dynamicIframeElm.src = "index.html"
        iframeHolder.appendChild($dynamicIframeElm);

        var iframeElm = document.getElementById(iframeElmId);
        console.log(offer)

        setTimeout(function () {
            iframeElm.contentWindow.postMessage(JSON.stringify({
                target: "cqz-browser-panel-re",
                origin: "window",
                message: {
                    action: "render_template",
                    data: offer
                }
            }), "*");
        }, 700);
    });
}

//chrome://cliqz/content/browser-panel/debug.html
var iframeHolder = document.getElementById("iframe-holder"),
mockOffer = [
    {
        "offer_id": "2",
        "display_id": "2",
        "template_name": "ticket_template",
        "template_data": {
            "voucher_classes": "",
            "title": "Perfect Holidays? Only with the right ride! ",
            "desc": "Get a convertible for the price of compact class car. Exclusively offered to Cliqz users.",
            "logo_url": "https://www.gutscheinpony.de/dynamic/460/logo-default/hertz.gif",
            "conditions": "Maßgeblich für die Inanspruchnahme des Gutscheins ist das Datum der Lieferung, nicht der Bestellung. Der Gutschein gilt nur für einen Online-Einkauf beim REWE Lieferservice und ist nicht beim REWE Abholservice oder im REWE Markt einlösbar. Der Gutschein ist nur bei einem Mindestrechnungsbetrag von 70 € einlösbar; vom Mindestrechnungsbetrag sind Druckwaren (bspw. Bücher, Zeitungen, Zeitschriften), Tabakwaren, aufladbare Geschenk- und Guthabenkarten (z. B. iTunes-Karten), Tchibo-Artikel, Zuzahlungen für Treuepunkt-Artikel, Pfand, Sperrgutaufschlag und Servicegebühren (bspw. Liefergebühren) abzuziehen. Jeder Gutschein gilt nur für den einmaligen Gebrauch und verliert danach seine Gültigkeit. Es ist nur ein REWE Lieferservice-Gutschein pro Bestellung einlösbar; andere Gutscheine, wie z. B. LAVIVA- und PAYBACK Papiercoupons und eCoupons, können zusätzlich eingelöst werden. Gutscheine müssen am Ende des Bestellvorgangs eingegeben werden. Der gutgeschriebene Betrag wird nicht im Bestellvorgang angezeigt, sondern erst nach Abschluss des Bestellvorgangs in der übersandten Rechnung. Keine Barauszahlung möglich.",
            "code": "*******",
            "call_to_action": {
                "url": "http://newurl",
                "target": "",
                "text": "Get the Offer"
            }
        }
    },
    {
        "offer_id": "2",
        "display_id": "2",
        "template_name": "ticket_template",
        "template_data": {
            "voucher_classes": "cqz-voucher-big-title",
            "title": "50% Off Your First Reservation",
            "desc": "Start === Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere rutrum augue a finibus. Integer tempor magna id accumsan lobortis. Curabitur suscipit enim sed sollicitudin dictum. Maecenas aliquet laoreet risus et volutpat. Aliquam facilisis sit amet massa pellentesque varius. Integer tristique nunc vel metus placerat plac End",
            "logo_url": "https://www.gutscheinpony.de/dynamic/460/logo-default/hertz.gif",
            "conditions": "Start === Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere rutrum augue a finibus. Integer tempor magna id accumsan lobortis. Curabitur suscipit enim sed sollicitudin dictum. Maecenas aliquet laoreet risus et volutpat. Aliquam facilisis sit amet massa pellentesque varius. Integer tristique nunc vel metus placerat placerat. Nam venenatis lobortis imperdiet. Praesent lacinia nibh quam, non tempus justo placerat eu. Duis lacus est, vestibulum vitae convallis pretium, semper vel sapien. Suspendisse convallis ipsum eu mattis gravida. Morbi auctor dui et enim vulputate egestas. Phasellus lorem risus, congue et consectetur at, feugiat sed velit. Nam luctus felis sed enim bibendum semper. Nunc ut ipsum ullamcorper, molestie nibh ultrices, tincidunt magna. Pellentesque fringilla suscipit ex nec iaculis. Aliquam vestibulum nibh odio, non cursus felis ullamcorper a. Sed orci ante, cursus eget dictum in, tincidunt quis ex. Donec at dapibus enim. Duis porta at mi ac tincidunt. Vestibulum imperdiet vel lectus sed lacinia. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam maximus semper nisi, vitae porta lectus ullamcorper vitae. Suspendisse mollis nulla sagittis, faucibus felis nec, aliquet neque.aucibus felis nec, aliquet neque.aucibus felis nec, aliquProin tempus luctus arcu quis vestibulum. Nunc aliquet elit ut tempus faucibus. Duis ultricies felis sit amet mi dictum venenatis. Nunc a metus magna. In non egestas ex. Praesent nisi turpis, === End",
            "call_to_action": {
                "url": "http://newurl",
                "target": "",
                "text": "Gutschein anzeigen"
            }
        }
    },
    {
        "offer_id": "2",
        "display_id": "2",
        "template_name": "ticket_template",
        "template_data": {
            "voucher_classes": "",
            "title": "25€ My test title is again here and all mighty powerful here and all mighty powerful",
            "desc": "Maßgeblich für die Inanspruchnahme des Gutscheins ist das Datum der Lieferung, nicht der Bestellung. Der Gutschein gilt nur für einen Online-Einkauf beim REWE Lieferservice und ist nicht beim REWE Abholservice oder im REWE Markt einlösbar. Der Gutschein ist nur bei einem Mindestrechnungsbetrag von 70 € einlösbar; vom Mindestrechnungsbetrag sind Druckwaren (bspw. Bücher, Zeitungen, Zeitschriften), Tabakwaren, aufladbare Geschenk- und Guthabenkarten (z. B. iTunes-Karten), Tchibo-Artikel, Zuzahlungen für Treuepunkt-Artikel, Pfand, Sperrgutaufschlag und Servicegebühren (bspw. Liefergebühren) abzuziehen. Jeder Gutschein gilt nur für den einmaligen Gebrauch und verliert danach seine Gültigkeit. Es ist nur ein REWE Lieferservice-Gutschein pro Bestellung einlösbar; andere Gutscheine, wie z. B. LAVIVA- und PAYBACK Papiercoupons und eCoupons, können zusätzlich eingelöst werden. Gutscheine müssen am Ende des Bestellvorgangs eingegeben werden. Der gutgeschriebene Betrag wird nicht im Bestellvorgang angezeigt, sondern erst nach Abschluss des Bestellvorgangs in der übersandten Rechnung. Keine Barauszahlung möglich.",
            "logo_url": "https://s3.amazonaws.com/cdn.cliqz.com/extension/offers/dazn-logo.png",
            "conditions": "Start === Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere rutrum augue a finibus. Integer tempor magna id accumsan lobortis. Curabitur suscipit enim sed sollicitudin dictum. Maecenas aliquet laoreet risus et volutpat. Aliquam facilisis sit amet massa pellentesque varius. Integer tristique nunc vel metus placerat placerat. Nam venenatis lobortis imperdiet. end",
            "code": "aBc234#as#",
            "call_to_action": {
                "url": "http://newurl",
                "target": "",
                "text": "Get the Offer"
            }
        }
    },
    {
        "offer_id": "2",
        "display_id": "2",
        "template_name": "ticket_template",
        "template_data": {
            "voucher_classes": "",
            "title": "Mit HAUSGOLD verkaufen Sie Ihre Immobilie zum Top Preis!",
            "desc": "Unsere Experten beraten Sie kompetent, unabhängig und vermitteln Ihnen den besten Makler. Jetzt kostenlose Immobilienbewertung inkl. Energieausweis anfordern!",
            "logo_url": "https://s3.amazonaws.com/cdn.cliqz.com/extension/offers/dazn-logo.png",
            "conditions": "",
            "call_to_action": {
                "url": "http://newurl",
                "target": "",
                "text": "Gutschein anzeigen"
            }
        }
    },
    {
        "offer_id": "2",
        "display_id": "2",
        "template_name": "default_template",
        "template_data": {
            "voucher_classes": "cqz-voucher-big-title",
            "title": "25€ My test title is again here and all mighty powerful",
            "desc": "",
            "logo_url": "https://s3.amazonaws.com/cdn.cliqz.com/extension/offers/dazn-logo.png",
            "conditions": "",
            "call_to_action": {
                "url": "http://newurl",
                "target": "",
                "text": "Gutschein anzeigen"
            }
        }
    },
    {
        "offer_id": "2",
        "display_id": "2",
        "template_name": "ticket_template",
        "template_data": {
            "voucher_classes": "",
            "title": "15% My test title is again here and all mighty powerful",
            "desc": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque imperdiet in erat facilisis laoreet. Curabitur auctor blandit lectus, non tristique urna porttitor non. Vivamus nibh risus, porta et sem ut, vulputate venenatis diam. Nulla finibus nisi nec tempor pretium. In tortor eros, vestibulum eget sagittis et, gravida et felis.",
            "captions": {
                "cap1": "15%",
                "cap2": "off",
            },
            "conditions": "",
            "call_to_action": {
                "url": "http://newurl",
                "target": "",
                "text": "Gutschein anzeigen"
            }
        }
    },
    {
        "offer_id": "2",
        "display_id": "2",
        "template_name": "ticket_template",
        "template_data": {
            "voucher_classes": "",
            "title": "15% My test title is again here and all mighty powerful",
            "desc": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque imperdiet in erat facilisis laoreet. Curabitur auctor blandit lectus, non tristique urna porttitor non. Vivamus nibh risus, porta et sem ut, vulputate venenatis diam. Nulla finibus nisi nec tempor pretium. In tortor eros, vestibulum eget sagittis et, gravida et felis.",
            "code": "aBc234#as",
            "captions": {
                "cap1": "15%",
                "cap2": "off",
            },
            "conditions": "",
            "call_to_action": {
                "url": "http://newurl",
                "target": "",
                "text": "Gutschein anzeigen"
            }
        }
    },
];

renderData(mockOffer);
