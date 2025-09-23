'use strict';
'require baseclass';
'require ui';

return baseclass.extend({
    __init__() {
        ui.menu.load().then(L.bind(this.render, this));
    },

    render(tree) {
        try {
            let node = tree;
            let url = '';

            this.renderModeMenu(node);

            if (L.env.dispatchpath.length >= 3) {
                for (var i = 0; i < 3 && node; i++) {
                    node = node.children[L.env.dispatchpath[i]];
                    url = url + (url ? '/' : '') + L.env.dispatchpath[i];
                }
                if (node)
                    this.renderTabMenu(node, url);
            }

            const showSideEl = document.querySelector('.showSide');
            if (showSideEl)
                showSideEl.addEventListener('click', ui.createHandlerFn(this, 'handleSidebarToggle'));

            const darkMaskEl = document.querySelector('.darkMask');
            if (darkMaskEl)
                darkMaskEl.addEventListener('click', ui.createHandlerFn(this, 'handleSidebarToggle'));

            const loadingEl = document.querySelector(".main > .loading");
            if (loadingEl) {
                loadingEl.style.opacity = '0';
                loadingEl.style.visibility = 'hidden';
            }

            const mainLeftEl = document.querySelector('.main-left');
            if (window.innerWidth <= 1152 && mainLeftEl)
                mainLeftEl.style.width = '0';

            window.addEventListener('resize', ui.createHandlerFn(this, 'handleSidebarToggle'), true);

            this.renderPopupAlerts();
        } catch (e) {
            console.error('menu-material4 render error:', e);
        }
    },

    // === Animasi buka/tutup iOS style (smooth) ===
    handleMenuExpand(ev) {
        const a = ev.target;
        const ul1 = a.parentNode;
        const ul2 = a.nextElementSibling;
        const alreadyActive = ul1.classList.contains('active');

        // Tutup semua slide lain dengan animasi halus
        document.querySelectorAll('li.slide.active').forEach(function (li) {
            if (li !== ul1) {
                const submenu = li.childNodes[1];
                const link = li.childNodes[0];

                if (submenu && submenu.style) {
                    submenu.style.transition = 'max-height 0.35s ease, opacity 0.3s ease';
                    submenu.style.maxHeight = submenu.scrollHeight + 'px';
                    submenu.style.opacity = 1;
                    requestAnimationFrame(() => {
                        submenu.style.maxHeight = '0px';
                        submenu.style.opacity = 0;
                    });

                    submenu.addEventListener('transitionend', function onEnd() {
                        li.classList.remove('active');
                        if (link) link.classList.remove('active');
                        submenu.removeEventListener('transitionend', onEnd);
                    });
                }
            }
        });

        if (alreadyActive) {
            // Tutup menu aktif dengan animasi
            if (ul2 && ul2.style) {
                ul2.style.transition = 'max-height 0.35s ease, opacity 0.3s ease';
                ul2.style.maxHeight = ul2.scrollHeight + 'px';
                ul2.style.opacity = 1;
                requestAnimationFrame(() => {
                    ul2.style.maxHeight = '0px';
                    ul2.style.opacity = 0;
                });

                ul2.addEventListener('transitionend', function onEnd() {
                    ul1.classList.remove('active');
                    a.classList.remove('active');
                    ul2.removeEventListener('transitionend', onEnd);
                });
            }
        } else {
            // Buka menu baru setelah animasi tutup menu lain
            if (!ul2) return;
            setTimeout(() => {
                ul2.style.overflow = 'hidden';
                ul2.style.transition = 'max-height 0.35s ease, opacity 0.3s ease';
                ul2.style.maxHeight = '0px';
                ul2.style.opacity = 0;
                requestAnimationFrame(() => {
                    ul2.style.maxHeight = ul2.scrollHeight + 'px';
                    ul2.style.opacity = 1;
                });

                ul1.classList.add('active');
                a.classList.add('active');
            }, 50);
        }

        a.blur();
        ev.preventDefault();
        ev.stopPropagation();
    },

    renderMainMenu(tree, url, level) {
        const l = (level || 0) + 1;
        const ul = E('ul', { 'class': level ? 'slide-menu' : 'nav' });
        const children = ui.menu.getChildren(tree);

        if (children.length == 0 || l > 2)
            return E([]);

        children.forEach(child => {
            const submenu = this.renderMainMenu(child, url + '/' + child.name, l);
            const isActive = (L.env.dispatchpath[l] == child.name);
            const hasChildren = submenu.children.length;

            ul.appendChild(E('li', { 'class': (hasChildren ? 'slide' + (isActive ? ' active' : '') : (isActive ? ' active' : '')) }, [
                E('a', {
                    'href': hasChildren ? '#' : L.url(url, child.name),
                    'class': hasChildren ? 'menu' + (isActive ? ' active' : '') : '',
                    'click': hasChildren ? ui.createHandlerFn(this, 'handleMenuExpand') : '',
                    'data-title': hasChildren ? '' : _(child.title),
                }, [_(child.title)]),
                submenu
            ]));
        });

        if (l == 1) {
            var container = document.querySelector('#mainmenu');
            if (container) {
                container.appendChild(ul);
                container.style.display = '';
            }
        }
        return ul;
    },

    renderModeMenu(tree) {
        const ul = document.querySelector('#modemenu');
        if (!ul) return;
        const children = ui.menu.getChildren(tree);

        children.forEach((child, index) => {
            const isActive = L.env.requestpath.length ? child.name === L.env.requestpath[0] : index === 0;

            ul.appendChild(E('li', {}, [
                E('a', { 'href': L.url(child.name), 'class': isActive ? 'active' : '' }, [_(child.title)])
            ]));

            if (isActive)
                this.renderMainMenu(child, child.name);

            if (index > 0 && index < children.length)
                ul.appendChild(E('li', { 'class': 'divider' }, [E('span')]))
        });

        if (children.length > 1 && ul.parentElement)
            ul.parentElement.style.display = '';
    },

    renderTabMenu(tree, url, level) {
        const container = document.querySelector('#tabmenu');
        if (!container) return E([]);
        const l = (level || 0) + 1;
        const ul = E('ul', { 'class': 'tabs' });
        const children = ui.menu.getChildren(tree);
        let activeNode = null;

        if (children.length == 0)
            return E([]);

        children.forEach(child => {
            const isActive = (L.env.dispatchpath[l + 2] == child.name);
            const activeClass = isActive ? ' active' : '';
            const className = 'tabmenu-item-%s %s'.format(child.name, activeClass);

            ul.appendChild(E('li', { 'class': className }, [
                E('a', { 'href': L.url(url, child.name) }, [_(child.title)])
            ]));

            if (isActive)
                activeNode = child;
        });

        container.appendChild(ul);
        container.style.display = '';

        if (activeNode)
            container.appendChild(this.renderTabMenu(activeNode, url + '/' + activeNode.name, l));

        return ul;
    },

    handleSidebarToggle(ev) {
        try {
            const width = window.innerWidth;
            const darkMask = document.querySelector('.darkMask');
            const mainRight = document.querySelector('.main-right');
            const mainLeft = document.querySelector('.main-left');
            if (!darkMask || !mainRight || !mainLeft) return;

            let open = mainLeft.style.width == '';

            if (width > 1152 || ev.type == 'resize')
                open = true;

            darkMask.style.visibility = open ? '' : 'visible';
            darkMask.style.opacity = open ? '' : 1;

            if (width <= 1152)
                mainLeft.style.width = open ? '0' : '';
            else
                mainLeft.style.width = '';

            mainLeft.style.visibility = open ? '' : 'visible';
            mainRight.style['overflow-y'] = open ? 'visible' : 'hidden';
        } catch (e) {
            console.error('handleSidebarToggle error:', e);
        }
    },

    // === Popup alert queue (AUTO-CLOSE DISABLED, CSS EXTERNAL) ===
    renderPopupAlerts() {
        if (typeof document === 'undefined' || typeof E !== 'function') return;

        this._popupQueue = this._popupQueue || [];
        this._popupProcessing = this._popupProcessing || false;

        const enqueueAlerts = (nodes) => {
            nodes.forEach(node => {
                if (!(node instanceof Element)) return;
                if (!node.classList.contains('alert') && !node.classList.contains('alert-message')) return;

                const cloned = E('div', {}, []);
                cloned.innerHTML = node.innerHTML;

                this._popupQueue.push(cloned);

                node.style.display = "none";
            });

            if (!this._popupProcessing) showNext();
        };

        const showNext = () => {
            if (this._popupQueue.length === 0) {
                this._popupProcessing = false;
                return;
            }
            this._popupProcessing = true;

            const contentNode = this._popupQueue.shift();

            const overlay = E('div', { 'class': 'popup-overlay' }, []);

            const infoEl = E('div', { 'class': 'popup-info' },
                ['Click the X button to close this message.']
            );

            const popup = E('div', { 'class': 'popup-box' }, [
                E('div', { 'class': 'popup-header' }, [
                    E('img', { 
                        'src': L.env.media + '/icon/caution.svg',
                        'class': 'popup-icon'
                    }),
                    E('span', { 'class': 'popup-title' }, ['Caution'])
                ]),
                E('div', { 'class': 'popup-content' }, [contentNode]),
                infoEl,
                E('button', {
                    'class': 'popup-close',
                    'click': () => { closePopup(); }
                }, ['X'])
            ]);
            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.style.opacity = "1";
                popup.style.opacity = "1";
                popup.style.transform = "scale(1)";
            });

            const closePopup = () => {
                overlay.style.opacity = "0";
                popup.style.opacity = "0";
                popup.style.transform = "scale(0.8)";
                setTimeout(() => {
                    if (overlay.parentNode) overlay.remove();
                    showNext();
                }, 300);
            };
        };

        enqueueAlerts(Array.from(document.querySelectorAll('.alert, .alert-message')));

        if (!this._popupObserver && typeof MutationObserver !== 'undefined') {
            this._popupObserver = new MutationObserver((mutations) => {
                const newAlerts = [];
                mutations.forEach(m => {
                    m.addedNodes.forEach(n => {
                        if (n.nodeType === 1 && (n.classList.contains('alert') || n.classList.contains('alert-message'))) {
                            newAlerts.push(n);
                        }
                    });
                });
                if (newAlerts.length) enqueueAlerts(newAlerts);
            });
            this._popupObserver.observe(document.body, { childList: true, subtree: true });
        }
    }
});
