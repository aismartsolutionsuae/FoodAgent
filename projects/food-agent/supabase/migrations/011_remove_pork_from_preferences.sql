-- Remove deprecated "pork" marker from user stop-lists.
update preferences
set stop_list = array_remove(stop_list, 'pork')
where stop_list is not null and 'pork' = any(stop_list);
