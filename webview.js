module.exports = (Franz) => {

  const getMessages = () => {

    const pageView = window.pageView;
    if (!pageView || !pageView.model) {
      return;
    }

    const user = pageView.model
      .get("user");
    if (!user) {
      return;
    }
    const userId = user.attributes.id;

    const unreadInboxEntrys = pageView.model
      .get("selectedInboxEntrys")
      .filter(x => x.attributes.needsAttention || x.attributes.flatGroupMembershipUnreadMessageCount > 0);

    const now = new Date();
    const mutedGroupIds = pageView.model
      .get("groupMemberships")
      .models
      .filter(x => x.attributes)
      .filter(x => x.attributes.groupId)
      .filter(x => x.attributes.userId)
      .filter(x => x.attributes.userId.id === userId)
      .filter(x => x.attributes.muteEndTime && x.attributes.muteEndTime > new Date())
      .map(x => x.attributes.groupId.id);

    const groupMessages = unreadInboxEntrys.filter(x => x.attributes.type === "GROUP");

    const directMessages = unreadInboxEntrys.filter(x => x.attributes.groupType === "ONE_ON_ONE").length;
    const mutedMessages =  groupMessages.filter(x => mutedGroupIds.includes(x.attributes.groupId.id)).length;
    const totalMessages = groupMessages.length;
    const indirectMessages = totalMessages - directMessages - mutedMessages;

    // console.log(directMessages, mutedMessages, totalMessages, indirectMessages);

    Franz.setBadge(directMessages, indirectMessages);
  };

  Franz.loop(getMessages);
}
