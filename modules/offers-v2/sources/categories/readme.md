# Objective / goal
The main idea of this module (`categories/*`) is provide an interface on to
the trigger engine to detect if a category is active or not.
The categories are organized in hierarchy, for example: `Electronics.Computer.Mouses`
is a category which the root (parent / first level category name) is `Electronics`,
later `Computer` and at the end (leaf) is `Mouses`.
A category can be considered as a (high level) tuple: (activation function,
list of patterns, name, hits per day, days to check).

The basic data a category will use to evaluate (the activation function) is as follow:
`[(totalHits, totalMatches), ...]`
Where each entry in the list is a given day (from now till
number_of_days_we_consider_for_the_category).

In order to be able to build this data we need to read the history of the
user (using the history-analyzer).

# Files structure

The files and functionalities are as follow:

## category.es

Is the definition of what a category represents (check [1]). Basically holds
the data and the functions associated to the category itself like: check
activation + hit the category with a match.

## category-tree

is just a helper tree class where we can easly query any category level (parent,
child, subchild, etc) and provide helper methods to get the categories.
A cateogry-tree-node can or cannot contain a category, since there are some
cases where we only will add a leaf, then automatically all the parents nodes
should be created.

## category-persistent-helper

Tried to separate the logic of storing the trees and all persistent data in this
class, so we can optimize the way we store it without changing the logic on the
other side. we basically need to mark the data as dirty and thats all.

## category-match

Trivial class to provide an interface of:
  - building categories patterns
  - given a url retrieve all the categories ids that matches (=> so we can
  increment the hits).

## day-count-helper

This is the nastiest module in terms of "architecture", but i didn't find a
better way to avoid duplicated data and a performance issue. This class will
hold the total number of urls visited per day, which is later provided to the
categories for calculating the activation function.
The best way will be hold this data in all the categories, but this will mean:
In any url change we should update all the categories => store all of them for
persistent. (we may have 2k categories).

## category-handler.

Is the entry point to handle everything regarding categories:
  - add / remove categories.
  - Performing the operation to the history when a new category is added.
  - Loading and saving the data.
  - counting the urls per day.
  - checking if a given url (pattern) matches some category and in that case
    increment (hit) each of them.

# Using categories

There are 2 new operations in (`trigger_machine/ops/category_expr`) that will
be the interface to the triggers:
  - add_categories (this is for now to be able to update categories using the
  same mechanisms, in the future we may change this to a resource or new endpoint).
  - is_category_active: which provides the minimum and almost unique function
  we need to check if a category is active or not.

# why we do this

Basically because:
  - Because will be much easier to create campaigns, just selectiong the
  categories that the offer belongs. => scale in terms of creating campaigns.
  - It is much easier to create a proper trigger tree (more efficient) than the
  current one.
  - It will perform much faster as it is currently on the client side.
  - Will be the first step for splitting the intent detection from the showing
  offers, which currently  are alltogeather in the triggers and is giving us
  some problems (complexity).


