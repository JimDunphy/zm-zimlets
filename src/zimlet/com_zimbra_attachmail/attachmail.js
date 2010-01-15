/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Zimlets
 * Copyright (C) 2009, 2010 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 *@Author Raja Rao DV
 * Allows attaching emails to message thats being composed via attachment dialogbox
 */

function com_zimbra_attachmail() {
}
com_zimbra_attachmail.prototype = new ZmZimletBase();
com_zimbra_attachmail.prototype.constructor = com_zimbra_attachmail;


com_zimbra_attachmail.prototype.init = function() {
	var attachDialog = this._attachDialog = appCtxt.getAttachDialog();
	var tabview = attachDialog ? attachDialog.getTabView() : null;
	this.AMV = new AttachMailTabView(tabview, this);
	var tabkey = attachDialog.addTab("attachmail", "Attach Mail", this.AMV);
	this.AMV.attachDialog = attachDialog;
	var callback = new AjxCallback(this.AMV, this.AMV.uploadFiles);
	attachDialog.addOkListener(tabkey, callback);

};


AttachMailTabView = function(parent, zimlet, className) {
	this.zimlet = zimlet;
	DwtTabViewPage.call(this, parent, className, Dwt.STATIC_STYLE);
	this.setScrollStyle(Dwt.SCROLL);
};

AttachMailTabView.prototype = new DwtTabViewPage;
AttachMailTabView.prototype.constructor = AttachMailTabView;

AttachMailTabView.prototype.toString = function() {
	return "AttachMailTabView";
};

AttachMailTabView.prototype.showMe = function() {
	DwtTabViewPage.prototype.showMe.call(this);
	this.setSize(Dwt.DEFAULT, "255");
	if (this._currentQuery == undefined) {
		this._currentQuery = this.getQueryFromFolder("2");
		this.treeView.setSelected("2");
	}
	this.executeQuery(this._currentQuery);
};


AttachMailTabView.prototype._resetQuery = function(newQuery) {
	if (this._currentQuery == undefined)
		return newQuery;

	if (this._currentQuery != newQuery) {
		this._offset = 0;
		this._currentQuery = newQuery;
	}
	return newQuery;
};


AttachMailTabView.prototype.getQueryFromFolder = function(folderId) {
	return this._resetQuery('inid:"' + folderId + '"');
};

AttachMailTabView.prototype.hideMe = function() {
	DwtTabViewPage.prototype.hideMe.call(this);
};

//Create UI for AttachMail Tab UI
AttachMailTabView.prototype._createHtml = function() {
	this._contentEl = this.getContentHtmlElement();
	this._tableID = Dwt.getNextId();
	this._folderTreeCellId = Dwt.getNextId();
	this._folderListId = Dwt.getNextId();
	var html = [];
	var idx = 0;

	html[idx++] = '<table width="100%" height="5%">';
	html[idx++] = '<TR><td><INPUT type="text" id="attDlg_attMsg_SearchField"></INPUT></td>';
	html[idx++] = '<td width="50%"><SPAN id="attDlg_attMsg_SearchBtn" /></td>';
	html[idx++] = '<td width="30%"><SPAN id="attDlg_attMsg_ViewMsgBtn" /></td>';
	html[idx++] = '<td><SPAN id="attDlg_attMsg_NavBtnCell" /></td></TR></table>';
	html[idx++] = '<table>';
	html[idx++] = '<tr>';
	html[idx++] = '<td valign="top" id="' + this._folderTreeCellId + '">';
	html[idx++] = '</td>';
	html[idx++] = '<td  valign="top"  id="' + this._folderListId + '">';
	html[idx++] = '</td>';
	html[idx++] = '</tr>';
	html[idx++] = '</table>';

	this._contentEl.innerHTML = html.join("");

	var searchButton = new DwtButton({parent:this});
	searchButton.setText("Search");
	searchButton.setSize("140");
	searchButton.addSelectionListener(new AjxListener(this, this._searchButtonListener));
	document.getElementById("attDlg_attMsg_SearchBtn").appendChild(searchButton.getHtmlElement());

	var viewMsgButton = new DwtButton({parent:this});
	viewMsgButton.setText("View Mail");
	viewMsgButton.addSelectionListener(new AjxListener(this, this._viewMsgButtonListener));
	document.getElementById("attDlg_attMsg_ViewMsgBtn").appendChild(viewMsgButton.getHtmlElement());

	this._navigationContainer = new DwtComposite(appCtxt.getShell());
	this._navTB = new ZmNavToolBar({parent:this._navigationContainer});
	var navBarListener = new AjxListener(this, this._navBarListener);
	this._navTB.addSelectionListener(ZmOperation.PAGE_BACK, navBarListener);
	this._navTB.addSelectionListener(ZmOperation.PAGE_FORWARD, navBarListener);

	document.getElementById("attDlg_attMsg_NavBtnCell").appendChild(this._navTB.getHtmlElement());
	this.showAttachMailTreeView();

	var params = {parent: appCtxt.getShell(), className: "AttachMailTabBox AttachMailList", posStyle: DwtControl.ABSOLUTE_STYLE, view: ZmId.VIEW_BRIEFCASE_ICON, type: ZmItem.ATT};
	var bcView = this._tabAttachMailView = new ZmAttachMailListView(params);
	bcView.reparentHtmlElement(this._folderListId);
	//bcView.addSelectionListener(new AjxListener(this, this._listSelectionListener));
	Dwt.setPosition(bcView.getHtmlElement(), Dwt.RELATIVE_STYLE);
	//this.executeQuery(ZmOrganizer.ID_BRIEFCASE);
};

AttachMailTabView.prototype._searchButtonListener =
function(ev) {
	this.treeView.deselectAll();
	var val = document.getElementById('attDlg_attMsg_SearchField').value;
	if (val == "")
		return;

	var query = this._resetQuery(val);
	this.executeQuery(query);
};

AttachMailTabView.prototype._viewMsgButtonListener =
function(ev) {
	var items = this.getSelectedMsgs();
	if (items.length > 0) {
		items[0].load({});
		ZmMailMsgView.detachMsgInNewWindow(items[0]);
	}
};

AttachMailTabView.prototype._navBarListener =
function(ev) {
	var op = ev.item.getData(ZmOperation.KEY_ID);
	this._paginate(op == ZmOperation.PAGE_FORWARD);
};

AttachMailTabView.prototype._paginate =
function(getNext) {
	this.executeQuery(this._currentQuery, getNext);

};


AttachMailTabView.prototype.searchFolder =
function(params) {
	var soapDoc = AjxSoapDoc.create("SearchRequest", "urn:zimbraMail");
	soapDoc.setMethodAttribute("types", "message");
	soapDoc.setMethodAttribute("limit", params.limit);
	soapDoc.setMethodAttribute("offset", params.offset);
	soapDoc.set("query", params.query);

	params.response = appCtxt.getAppController().sendRequest({soapDoc:soapDoc,noBusyOverlay:false});
	this.handleSearchResponse(params);
};

AttachMailTabView.prototype.handleSearchResponse =
function(params) {
	var response = params.response;
	if (response && (response.SearchResponse || response._data.SearchResponse)) {
		params.searchResponse = response.SearchResponse || response._data.SearchResponse;
		params.items = this.processDocsResponse(params);
	}
	if (params.callback) {
		params.callback.run(params);
	}
};

AttachMailTabView.prototype.processDocsResponse =
function(params) {
	var msgs = params.searchResponse.m;
	var mailList = new ZmMailList(ZmItem.MSG, this._currentSearch);
	mailList.setHasMore(params.searchResponse.more);
	if (msgs == undefined)
		return mailList;

	for (var i = 0; i < msgs.length; i++) {
		var msg = msgs[i];
		mailList.addFromDom(msg);
	}
	return mailList;
};
//---------------

AttachMailTabView.prototype.showResultContents =
function(params) {
	var items = params.items;
	this._navTB.enable(ZmOperation.PAGE_BACK, params.offset > 0);
	this._navTB.enable(ZmOperation.PAGE_FORWARD, items.hasMore());
	var numItems = items.size();
	if (numItems == 0)
		this._navTB.setText("");
	else
		this._navTB.setText((this._offset + 1) + "-" + (this._offset + items.size()));


	if (items) {
		this._list = items;
	} else {
		this._list = new ZmList(ZmItem.BRIEFCASE_ITEM);
	}
	var bcView = this._tabAttachMailView;
	bcView.set(this._list);
};


AttachMailTabView.prototype._handleKeys = function(ev) {
	var key = DwtKeyEvent.getCharCode(ev);
	return (key != DwtKeyEvent.KEY_ENTER && key != DwtKeyEvent.KEY_END_OF_TEXT);
};

AttachMailTabView.prototype.gotAttachments =
function() {
	return false;
};

AttachMailTabView.prototype.getSelectedMsgs =
function() {
	var bcView = this._tabAttachMailView;
	return bcView.getSelection();
};

AttachMailTabView.prototype.uploadFiles =
function(attachmentDlg, docIds) {
	if (!docIds) {
		docIds = [];
		var items = this.getSelectedMsgs();
		if (!items || (items.length == 0)) {
			return;
		}
		for (var i in items) {
			docIds.push(items[i].id);
		}


	}

	this._createHiddenAttachments(docIds);
	if(attachmentDlg == undefined)//in 5.x this is undefined, so use the local one
		attachmentDlg = this.attachDialog;

	if (attachmentDlg._uploadCallback) {
		attachmentDlg._uploadCallback.run(AjxPost.SC_OK, null, null);
	}
	this._hiddenView.getHtmlElement().innerHTML = "";//reset
};

AttachMailTabView.prototype._createHiddenAttachments =
function(items) {
	var composeView = appCtxt.getAppViewMgr().getCurrentView();
	this._hiddenView = new DwtComposite(appCtxt.getShell());
	var html = new Array();
	var j = 0;
	var name = "";
	if(composeView._sessionId == undefined)
		name = ZmComposeView.FORWARD_MSG_NAME;//5.x
	else
		name = ZmComposeView.FORWARD_MSG_NAME +  composeView._sessionId;

		
	for (var i = 0; i < items.length; i++) {
		html[j++] = "<input type=checkbox name='";
		html[j++] = name;
		html[j++] = "' checked=true value='";
		html[j++] = items[i];
		html[j++] = "'/>";
	}
	this._hiddenView.getHtmlElement().innerHTML = html.join("");

};

AttachMailTabView.prototype.showAttachMailTreeView =
function() {

	//Force create deferred folders if not created
	var aCtxt = appCtxt.isChildWindow ? parentAppCtxt : appCtxt;
	var briefcaseApp = aCtxt.getApp(ZmApp.MAIL);
	briefcaseApp._createDeferredFolders();

	var base = this.toString();
	var acct = appCtxt.getActiveAccount();
	var params = {
		treeIds: ["FOLDER"],
		fieldId: this._folderTreeCellId,
		overviewId: (appCtxt.multiAccounts) ? ([base, acct.name].join(":")) : base,
		account: acct
	};
	this._setOverview(params);

};

AttachMailTabView.prototype._setOverview =
function(params) {
	var overviewId = params.overviewId;
	var opc = appCtxt.getOverviewController();
	var overview = opc.getOverview(overviewId);
	if (!overview) {
		var ovParams = {
			overviewId: overviewId,
			overviewClass: "AttachMailTabBox",
			headerClass: "DwtTreeItem",
			noTooltips: true,
			treeIds: params.treeIds
		};
		overview = this._overview = opc.createOverview(ovParams);
		overview.set(params.treeIds);
		document.getElementById(params.fieldId).appendChild(overview.getHtmlElement());
		this.treeView = overview.getTreeView("FOLDER");
		this.treeView.addSelectionListener(new AjxListener(this, this._treeListener));
		this._hideRoot(this.treeView);
	} else if (params.account) {
		overview.account = params.account;
	}
};

AttachMailTabView.prototype._treeListener =
function(ev) {
	if (ev.detail == DwtTree.ITEM_SELECTED) {
		var ti = ev.item;
		var folder = ti.getData(Dwt.KEY_OBJECT);
		if (folder) {
			document.getElementById('attDlg_attMsg_SearchField').value = "in:" + folder.getSearchPath();
			var query = this.getQueryFromFolder(folder.id);
			this.executeQuery(query);
		}
	}
};

AttachMailTabView.prototype._hideRoot =
function(treeView) {
	var ti = treeView.getTreeItemById(ZmOrganizer.ID_ROOT);
	if (!ti) {
		var rootId = ZmOrganizer.getSystemId(ZmOrganizer.ID_ROOT);
		ti = treeView.getTreeItemById(rootId);
	}
	ti.showCheckBox(false);
	ti.setExpanded(true);
	ti.setVisible(false, true);
};


AttachMailTabView.prototype.setSize =
function(width, height) {
	DwtTabViewPage.prototype.setSize.call(this, width, height);
	var size = this.getSize();

	var treeWidth = size.x * 0.350;
	var listWidth = size.x - treeWidth - 15;
	var newHeight = height - 55;
	this._overview.setSize(treeWidth, newHeight);
	this._tabAttachMailView.setSize(listWidth - 5, newHeight);
	return this;
};


AttachMailTabView.prototype.executeQuery =
function(query, forward) {
	if (this._limit == undefined)
		this._limit = 50;


	if (this._offset == undefined)
		this._offset = 0;

	if (forward != undefined) {
		if (forward) {
			this._offset = this._offset + 50;
		} else {
			this._offset = this._offset - 50;
		}
	}

	//var bController = this._AttachMailController;
	var callback = new AjxCallback(this, this.showResultContents);
	this.searchFolder({query:this._currentQuery, offset:this._offset, limit:this._limit , callback:callback});
};





//------------------ZmAttachMailController----------------------------------------
ZmAttachMailController = function(container, app) {
	if (arguments.length == 0) { return; }

};

ZmAttachMailController.prototype = new ZmListController;
ZmAttachMailController.prototype.constructor = ZmAttachMailController;


ZmAttachMailController.prototype._resetToolbarOperations =
function() {
	//override to avoid js expn although we dont have a toolbar per say
};
//----------------------ZmAttachMailController------------------------------------





//----------------------ZmAttachMailListView------------------------------------
ZmAttachMailListView = function(params) {
	ZmListView.call(this, params);
	this._controller = new ZmAttachMailController();
};


ZmAttachMailListView.prototype = new ZmListView;
ZmAttachMailListView.prototype.constructor = ZmAttachMailListView;


ZmAttachMailListView.prototype._getDivClass =
function(base, item, params) {
	return "";
};

ZmAttachMailListView.prototype._getCellContents =
function(htmlArr, idx, item, field, colIdx, params) {
	//if (field == "fr")
	var fragment = item.fragment;
	if (fragment) {
		if (fragment.length > 100) {
			fragment = fragment.substring(0, 96) + "...";
		}
	} else {
		fragment = "";
	}
	fragment = AjxStringUtil.htmlEncode(fragment, true);

	var from = "";
	if (item.getAddress("FROM").name != "") {
		from = item.getAddress("FROM").name;
	} else {
		from = item.getAddress("FROM").address;
	}
	var attachCell = "";
	if (item.hasAttach){
		attachCell = "<td width='16px'><div class='ImgAttachment' /></td>";
	}
	htmlArr[idx++] = "<DIV style=\"height:70px;border-style:solid;border-width:1px 0;cursor:pointer;border-color:#E0E0E0;\">";
	htmlArr[idx++] = "<TABLE width=100%><tr> "; 
	htmlArr[idx++] = attachCell;
	htmlArr[idx++] = "<td  align=left><span style=\"font-weight:bold;font-size:14px;\"> ";
	htmlArr[idx++] = from;
	htmlArr[idx++] = "</SPAN></td><td align=right>";
	htmlArr[idx++] = AjxDateUtil.computeDateStr(params.now || new Date(), item.date);
	htmlArr[idx++] = "</td></tr></TABLE>";
	var subject = item.subject;
	if (subject == undefined)
		subject = "<no subject>";
	else  if (subject.length > 35) {
		subject = subject.substring(0, 32) + "...";
	}

	htmlArr[idx++] = "<span style=\"font-weight:bold;\"> " + subject + "</SPAN>";
	if (fragment != "") {
		htmlArr[idx++] = "<span style=\"color:gray\"> - " + fragment + "</SPAN></DIV>";
	}
	return idx;
};
//----------------------ZmAttachMailListView------------------------------------

