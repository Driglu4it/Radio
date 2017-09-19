const Applet = imports.ui.applet;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Main = imports.ui.main;
const Util = imports.misc.util;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const MessageTray = imports.ui.messageTray;

let icon_radio_on;
let icon_radio_off;
let isPlaying = false;
let currentStationId;
let currentStationTitle;

function MyApplet(orientation, panel_height, instance_id) {
  this._init(orientation, panel_height, instance_id);
}
MyApplet.prototype = {
  __proto__: Applet.IconApplet.prototype,
  _init: function(orientation, panel_height, instance_id) {
    Main.Util.spawnCommandLine("mocp");
    Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);
    this.menuManager = new PopupMenu.PopupMenuManager(this);
    this.menu = new Applet.AppletPopupMenu(this, orientation);
    this.menuManager.addMenu(this.menu);
    this.settings = new Settings.AppletSettings(this, "radio@driglu4it", instance_id);
    this.settings.bind("tree", "name", this.on_settings_changed);

    // radio on icon for notifications
    let radio_on_icon_file = Gio.file_new_for_path(icon_radio_on);
    let radio_on_gicon = new Gio.FileIcon({ file: radio_on_icon_file });
    this.radio_on_icon = new St.Icon({ icon_name: "radio-on", gicon: radio_on_gicon, icon_size: 22, icon_type: St.IconType.SYMBOLIC, style_class: "applet-icon" });

    // radio off icon for notifications
    let radio_off_icon_file = Gio.file_new_for_path(icon_radio_off);
    let radio_off_gicon = new Gio.FileIcon({ file: radio_off_icon_file });
    this.radio_off_icon = new St.Icon({ icon_name: "radio-off", gicon: radio_off_gicon, icon_size: 22, icon_type: St.IconType.SYMBOLIC, style_class: "applet-icon" });

    this.on_settings_changed();
  },
  on_settings_changed: function() {
    this.set_applet_tooltip(_("Radio++"));
    this.set_applet_icon_symbolic_path(icon_radio_off);
    this.menu.removeAll();
    this.menuManager.addMenu(this.menu);
    var i;
    var j = this.name.length;
    for (i = 0; i < j; i++) {
      let title = this.name[i].name;
      let id = this.name[i].url;
      let menuitem = new PopupMenu.PopupMenuItem(title);
      menuitem.connect('activate', Lang.bind(this, function() {
          this.startCM(id, title);
        })
      );
      this.menu.addMenuItem(menuitem);
    }
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addAction(_("Stop"), Lang.bind(this, function(event) {
        this.stopCM();
      })
    );
  },

  startCM: function(id, title) {
    Main.Util.spawnCommandLine("mocp -c -a -p " + id);
    this._notifyMessage(this.radio_on_icon, _("Playing" + " " + title));
    this.set_applet_icon_symbolic_path(icon_radio_on);
    this.set_applet_tooltip(_("Radio++ " + title + " playing"));
    this.currentStationId = id;
    this.currentStationTitle = title;
    this.isPlaying = true;
  },

  stopCM: function() {
    Main.Util.spawnCommandLine("mocp -s");
    this._notifyMessage(this.radio_off_icon, _("Stopped " + this.currentStationTitle));
    this.set_applet_icon_symbolic_path(icon_radio_off);
    this.set_applet_tooltip(_("Radio++ " + this.currentStationTitle + " stopped"));
    this.isPlaying = false;
  },

  _onButtonPressEvent: function(actor, event) {
    let buttonId = event.get_button();
    if (buttonId === 2) {
      if (this.isPlaying) {
        this.stopCM();
      } else {
        if (this.currentStationId && this.currentStationTitle) {
          this.startCM(this.currentStationId, this.currentStationTitle);
        } else {
          this._notifyMessage(
            this.radio_off_icon, _("No station selected. Select a station from the menu."));
        }
      }
    }
    return Applet.Applet.prototype._onButtonPressEvent.call(this, actor, event);
  },

  _ensureSource: function() {
    if (!this._source) {
      this._source = new MessageTray.Source();
      this._source.connect("destroy", Lang.bind(this, function() { this._source = null; }));
      if (Main.messageTray) Main.messageTray.add(this._source);
    }
  },

  _notifyMessage: function(notificationIcon, text) {
    if (this._notification) this._notification.destroy();
    /* must call after destroying previous notification,
     * or this._source will be cleared */
    this._ensureSource();
    /* set icon every time, otherwise it breaks after fist time..(?) */
    let icon = new St.Icon({ icon_name: notificationIcon.get_name(), gicon: notificationIcon.get_gicon(), icon_type: St.IconType.SYMBOLIC, icon_size: 22 });
    this._notification = new MessageTray.Notification( this._source, _("Radio++"), text, { icon: icon });
    this._notification.setUrgency(MessageTray.Urgency.NORMAL);
    this._notification.setTransient(true);
    this._notification.connect("destroy", function() { this._notification = null; });
    this._source.notify(this._notification);
  },

  on_applet_clicked: function(event) {
    this.menu.toggle();
  },
  on_applet_removed_from_panel: function() {
    this.settings.finalize();
  }
};

function main(metadata, orientation, panel_height, instance_id) { // Make sure you collect and pass on instanceId
  // icon paths
  icon_radio_on = metadata.path + "/radio-on-symbolic.svg";
  icon_radio_off = metadata.path + "/radio-off-symbolic.svg";

  let myApplet = new MyApplet(orientation, panel_height, instance_id);
  return myApplet;
}
