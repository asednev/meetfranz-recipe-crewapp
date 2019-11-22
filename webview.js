module.exports = Franz => {
  let lastStore = null;

  function calcUnreadCounts(conversationIds, store, uid) {
    const now = new Date();

    const memberships = conversationIds
      .map(x => {
        const memberships = store.memberships.byFromId[`cvn.${x}`];
        if (!memberships) {
          return;
        }

        return memberships[`cvn.${x}|usr.${uid}`];
      })
      .filter(x => !!x)
      .filter(mbsp => mbsp.metadataId)
      .map(mbsp => mbsp.metadataId.id);

    const membershipMetadatas = memberships
      .map(x => store.membershipMetadatas.byId[x])
      .filter(x => !!x)
      .filter(x => !x.muteEndTime || (x.muteEndTime && x.muteEndTime < now)); // filter out muted conversations

    // calculate number of conversations that have unread messages or mentions
    const conversationCounts = membershipMetadatas.reduce((map, v) => {
      if (!v.fromId || !v.fromId.id) {
        return map;
      }
      const id = v.fromId.id;

      if (v.unreadMessageCount > 0 || v.unreadMentionCount > 0) {
        if (!map.has(id)) {
          map.set(id, {
            conversations: 0,
            mentions: 0
          });
        }
        const counts = map.get(id);
        counts.conversations += v.unreadMessageCount > 0 ? 1 : 0;
        counts.mentions += v.unreadMentionCount > 0 ? 1 : 0;
      }
      return map;
    }, new Map());

    let totalConversations = 0; // # of conversations with unread messages
    let totalMentions = 0; // # of conversations with unread mentions

    conversationCounts.forEach(value => {
      totalConversations += value.conversations;
      totalMentions += value.mentions;
    });

    return {
      conversations: totalConversations,
      mentions: totalMentions
    };
  }

  const getMessages = () => {
    const store = window.getStoreState();
    if (!store) {
      return;
    }
    if (store === lastStore) {
      return;
    }
    if (!store.user) {
      return;
    }
    if (!store.inboxEntrys) {
      return;
    }
    if (!store.memberships) {
      return;
    }

    const uid = store.user.id;

    const directConversations = Object.values(store.inboxEntrys.byId)
      .filter(x => x.conversationType === "DIRECT")
      .map(x => x.conversationId)
      .filter(x => !!x)
      .map(x => x.id);

    const indirectConversations = Object.values(store.inboxEntrys.byId)
      .filter(x => x.conversationType === "MULTI")
      .map(x => x.conversationId)
      .filter(x => !!x)
      .map(x => x.id);

    const directCounts = calcUnreadCounts(directConversations, store, uid);
    const indirectCounts = calcUnreadCounts(indirectConversations, store, uid);

    // console.log('directCounts', directCounts);
    // console.log('indirectCounts', indirectCounts);

    const groupMessages = indirectCounts.conversations;
    const unreadDirect = directCounts.conversations;
    const unreadMentions = indirectCounts.mentions + directCounts.mentions;

    const indirectMessages = groupMessages;
    const directMessages = unreadDirect + unreadMentions;

    // console.log(directMessages, indirectMessages);

    Franz.setBadge(directMessages, indirectMessages);

    lastStore = store;
  };

  Franz.loop(getMessages);
};
